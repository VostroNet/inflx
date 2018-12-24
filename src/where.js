import Op from "./operators";
import * as Influx from "influx";

const symbolMap = {
  [Op.ne]: "!=",
  [Op.eq]: "=",
  [Op.gt]: ">",
  [Op.gte]: ">=",
  [Op.lt]: "<",
  [Op.lte]: "<=",
  [Op.and]: "and",
  [Op.or]: "or",
};

const relations = [Op.and, Op.or];


export default function processWhereOperators(ql, where, validFields) {
  return processObj(ql, where, validFields);
}

function extractField(value, parentKey, opSymbol = Op.eq) {
  if (typeof value === "string" || typeof value === "number") {
    return [{operator: Op.eq, key: parentKey, value}];
  }
  if (typeof value === "object" && value !== null) {
    const symbols = Object.getOwnPropertySymbols(value);
    if (symbols.length > 0) {
      return symbols.map((symbol) => {
        return {operator: symbol, key: parentKey, value: value[symbol]};
      });
    }
    const keys = Object.keys(value);
    if (keys.length > 0) {
      return keys.reduce((o, key) => {
        if (typeof value[key] === "object" && value[key] !== null) {
          return o.concat(extractField(value[key], key, opSymbol));
        }
        return o.concat([{operator: opSymbol, key, value: value[key]}]);
      }, []);
    }
  }
  return [];
}

function createQuerySection(op) {
  let value;
  if (typeof op.value === "number") {
    value = op.value;
  } else if (op.value instanceof Date) {
    value = Influx.escape.stringLit(op.value.toISOString());
  } else {
    value = Influx.escape.stringLit(op.value);
  }
  let column = Influx.escape.quoted(op.key);
  return `${column} ${symbolMap[op.operator]} ${value}`;
}




function processVar(ql, value, validFields, key, parentKey, relationSymbol = Op.and, opSymbol = Op.eq) {
  if (typeof key === "symbol") {
    if (relations.indexOf(key) > -1) {
      relationSymbol = key;
    } else {
      opSymbol = key;
    }
  } else if (typeof key === "string") {
    parentKey = key;
  }
  if (typeof value === "symbol") {
    if (relations.indexOf(value) > -1) {
      relationSymbol = value;
    } else {
      opSymbol = value;
    }
  }

  let operator = symbolMap[opSymbol];
  let relation = symbolMap[relationSymbol];
  let k = typeof key === "string" ? key : parentKey;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" ) {
    return ql.where(k, value, relation, operator);
  }
  if (value instanceof Date) {
    return ql.where(k, value.toISOString(), relation, operator);
  }
  if (Array.isArray(value)) {
    const fields = value.reduce((o, v) => {
      return o.concat(extractField(v, parentKey));
    }, []);
    const section = fields.map((r) => createQuerySection(r));
    const str = section.join(` ${symbolMap[relationSymbol]} `);
    return ql.where(str);
  }
  if (typeof value === "object" && value !== null) {
    const fields = extractField(value, parentKey);
    const section = fields.map((r) => createQuerySection(r));
    const str = section.join(` ${symbolMap[relationSymbol]} `);
    return ql.where(str);
  }
  return undefined;
}

function processObj(ql, obj, validFields, key, parentKey, relationSymbol, opSymbol) {
  Object.keys(obj).concat(Object.getOwnPropertySymbols(obj)).forEach((k) => {
    return processVar(ql, obj[k], validFields, k, parentKey, relationSymbol, opSymbol);
  });
  return ql;
}
