import * as Influx from "influx";
import Model from "./model";
import Operators from "./operators";

import logger from "./logger";
const log = logger("index");


export const Types = Influx.FieldType;
export const Precision = Influx.Precision;
export const escape = Influx.escape;
export const Op = Operators;

export default class InfluxORM {
  static Types = Influx.FieldType;
  static Precision = Influx.Precision;
  static escape = Influx.escape;
  static Op = Operators;
  constructor(config) {
    this.config = config;
    this.models = {};
  }
  createConnection() {
    const schemas = Object.keys(this.models).map((modelName) => {
      return this.models[modelName].schema;
    });
    log.debug(`creating connection ${this.config.host}:${this.config.port}`);
    this.connection = new Influx.InfluxDB(Object.assign({}, {
      database: this.config.database,
      host: this.config.host || "localhost",
      port: this.config.port || 8086,
      username: this.config.username,
      password: this.config.password,
      schemas,
    }));
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

