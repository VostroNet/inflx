import InfluxQL from "influx-ql";
import processWhereOperators from "./where";
import waterfall from "./waterfall";


async function runHook(model, hookName, context, initialArg, ...extra) {
  if (model.hooks) {
    if (model.hooks[hookName]) {
      return waterfall(Array.isArray(this.hooks[hookName]) ? this.hooks[hookName] : [this.hooks[hookName]], (hook, prevVal) => {
        return hook.apply(context, [prevVal].concat(extra || []));
      }, initialArg);
    }
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
    let opts = await runHook(this, "beforeFindInitOpts", undefined, options);
    const ql = this.createQueryString(opts);
    await runHook(this, "beforeFind", undefined, opts, ql);
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
    return runHook(this, "afterFind", undefined, models, opts);
  }

  static async count(options) {
    let opts = await runHook(this, "beforeCount", undefined, options);
    const ql = this.createQueryString(opts);
    ql.addFunction("count", Object.keys(this.schema.fields)[0]);
    const results = await this.inflx.query(ql.toSelect(), {
      precision: options.precision,
      retentionPolicy: options.retentionPolicy,
      database: options.database,
    });
    let fullCount = 0;
    if (results.length > 0) {
      fullCount = results[0].count;
    }
    return runHook(this, "afterCount", undefined, fullCount, opts);
  }
  static async createBulk(records = [], options) {
    let r = await runHook(this, "beforeCreateBulk", undefined, records, options = {});
    const conn = this.inflx.getConnection();
    await conn.writePoints(r.map((record) => {
      return {
        measurement: this.schema.measurement,
        tags: this.schema.tags.reduce((o, tag) => {
          if (record[tag]) {
            o[tag] = record[tag];
          }
          return o;
        }, {}),
        fields: Object.keys(this.schema.fields).reduce((o, f) => {
          if (record[f]) {
            o[f] = record[f];
          }
          return o;
        }, {}),
      };
    }), {
      database: options.database,
      precision: options.precision,
      retentionPolicy: options.retentionPolicy,
    });
    return runHook(this, "afterCreateBulk", undefined, records, options);
  }
}
