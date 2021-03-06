import InfluxQL from "influx-ql";
import processWhereOperators from "./where";
import waterfall from "./waterfall";


async function runHook(model, hookName, options = {}, context, initialArg, ...extra) {
  let hooks = [].concat();
  if (model.hooks) {
    if (model.hooks[hookName]) {
      hooks = hooks.concat(model.hooks[hookName]);
    }
  }
  if (options.hooks) {
    if (options.hooks[hookName]) {
      hooks = hooks.concat(options.hooks[hookName]);
    }
  }
  if (hooks.length > 0) {
    return waterfall(hooks, (hook, prevVal) => {
      return hook.apply(context, [prevVal].concat(extra || []));
    }, initialArg);
  }
  return initialArg;
}

export default class Model {
  constructor(values) {
    Object.assign(this, values);
  }
  static init(schema, options = {}) {
    if (!options.inflx) {
      throw new Error("No Inflx instance passed");
    }
    this.inflx = options.inflx;
    if (!options.modelName) {
      options.modelName = this.name;
    }
    this.modelName = options.modelName;
    this.schema = schema;
    this.hooks = schema.hooks;
    this.options = options;
  }
  static createQueryString(options) {
    const {where} = options;
    const ql = new InfluxQL(this.inflx.config.database);
    if (options.retentionPolicy || this.schema.retentionPolicy) {
      ql.RP = options.retentionPolicy || this.schema.retentionPolicy;
    }
    ql.start = options.start;
    ql.end = options.end;
    ql.limit = options.limit;
    ql.offset = options.offset;
    ql.slimit = options.slimit;
    ql.soffset = options.soffset;
    ql.order = options.order;
    ql.fill = options.fill;
    ql.addMeasurement(this.schema.measurement);
    // ql.addField.apply(ql, Object.keys(this.schema.fields));
    // ql.addField.apply(ql, this.schema.tags);
    if ((options.groups || []).length > 0) {
      options.groups.map((g) => ql.addGroup(g));
    }
    if (where) {
      processWhereOperators(ql, where);
    }
    return ql;
  }
  static async findAll(options) {
    let opts = await runHook(this, "beforeFindInitial", options, undefined, options);
    const ql = this.createQueryString(opts);
    await runHook(this, "beforeFind", options, undefined, opts, ql);
    // ql.addField.apply(ql, Object.keys(this.schema.fields));
    // ql.addField.apply(ql, this.schema.tags);
    const results = await this.inflx.query(ql.toSelect(), {
      precision: options.precision,
      retentionPolicy: options.retentionPolicy,
      database: options.database,
    });
    let models;
    if (!options.raw) {
      models = results.map((r) => new this(r));
    } else {
      models = results;
    }
    return runHook(this, "afterFind", options, undefined, models, opts);
  }

  static async count(options) {
    let opts = await runHook(this, "beforeCountInitial", options, undefined, options);
    const ql = this.createQueryString(opts);
    await runHook(this, "beforeCount", options, undefined, options, ql);
    ql.addFunction("count", Object.keys(this.schema.fields)[0]);
    ql.subQuery();
    ql.addFunction("sum", "count");
    await runHook(this, "beforeCountArgsSet", options, undefined, options, ql);
    const results = await this.inflx.query(ql.toSelect(), {
      precision: options.precision,
      retentionPolicy: options.retentionPolicy,
      database: options.database,
    });
    let fullCount = 0;
    if (results.length > 0) {
      fullCount = results[0].sum;
    }
    return runHook(this, "afterCount", options, undefined, fullCount, opts);
  }
  static async createBulk(records = [], options) {
    let r = await runHook(this, "beforeCreateBulk", options, undefined, records, options = {});
    const conn = this.inflx.getConnection();
    const newData = r.map((record) => {
      return {
        measurement: this.schema.measurement,
        tags: this.schema.tags.reduce((o, tag) => {
          if (record[tag] !== undefined && record[tag] !== "") {
            o[tag] = record[tag];
          }
          return o;
        }, {}),
        fields: Object.keys(this.schema.fields).reduce((o, f) => {
          if (record[f] !== undefined && record[f] !== "") {
            o[f] = record[f];
          }
          return o;
        }, {}),
        timestamp: record.time,
      };
    });
    try {
      await conn.writePoints(newData, {
        database: options.database,
        precision: options.precision,
        retentionPolicy: options.retentionPolicy,
      });
    } catch(err) {
      console.log("influx error", err);
    }
    return runHook(this, "afterCreateBulk", options, undefined, records, options);
  }
}
