import * as Influx from "influx";
import InfluxQL from "influx-ql";
import Model from "./model";
import Operators from "./operators";

import logger from "./logger";
import waterfall from "./waterfall";
const log = logger("index");


export const Types = Influx.FieldType;
export const Precision = Influx.Precision;
export const escape = Influx.escape;
export const Op = Operators;
export const QL = InfluxQL;

export default class InfluxORM {
  static Types = Influx.FieldType;
  static Precision = Influx.Precision;
  static escape = Influx.escape;
  static Op = Operators;
  static QL = InfluxQL;
  constructor(config) {
    this.config = config;
    this.models = {};
  }
  async reset() {
    const conn = this.getConnection();
    await conn.dropDatabase(this.config.database);
    return conn.createDatabase(this.config.database);
  }
  async sync() {
    const {retentionPolicies, continuousQueries} = this.config;
    const conn = this.getConnection();
    if (retentionPolicies) {
      //SHOW RETENTION POLICIES ON "taringa";
      const existingRP = await conn.showRetentionPolicies(this.config.database);
      await waterfall(Object.keys(retentionPolicies), async(name) => {
        const searchRPs = existingRP.filter((rp) => rp.name === name);
        const options = Object.assign({replication: 1}, retentionPolicies[name]);
        if (searchRPs.length > 0) {
          await conn.alterRetentionPolicy(name, options);
        } else {
          await conn.createRetentionPolicy(name, options);
        }
      });
    }
    if (continuousQueries) {
      const existingCQ = await conn.showContinousQueries(this.config.database);
      await waterfall(Object.keys(continuousQueries), async(name) => {
        const searchCQs = existingCQ.filter((rcq) => rcq.name === name);
        const query = continuousQueries[name];
        if (searchCQs.length > 0) {
          await conn.dropContinuousQuery(name);
          //await conn.alterContinuousQuery(name, query);
        }
        await conn.createContinuousQuery(name, query);
      });
    }
  }
  createConnection() {
    const schemas = Object.keys(this.models).map((modelName) => {
      return this.models[modelName].schema;
    });
    const cfg = Object.assign({}, {
      database: this.config.database,
      host: this.config.host || "localhost",
      port: this.config.port || 8086,
      username: this.config.username,
      password: this.config.password,
      schemas,
    });
    log.debug(`creating connection ${cfg.host}:${cfg.port}`);
    this.connection = new Influx.InfluxDB(cfg);
  }
  getConnection() {
    if (!this.connection) {
      this.createConnection();
    }
    return this.connection;
  }
  define(modelName, schema, options = {}) {
    options.modelName = modelName;
    options.inflx = this;
    const model = class extends Model {};
    model.init(schema, options);
    this.models[modelName] = model;
    this.connection = undefined;
    return model;
  }
  query(query, options) {
    const conn = this.getConnection();
    log.info("query", query);
    return conn.query(query, options);
  }
  raw(query, options) {
    const conn = this.getConnection();
    log.info("raw-query", query);
    return conn.queryRaw(query, options);
  }

}

