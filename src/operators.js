
// https://github.com/sequelize/sequelize/blob/master/lib/operators.js
export default {
  eq: Symbol.for("eq"),
  ne: Symbol.for("ne"),
  gte: Symbol.for("gte"),
  gt: Symbol.for("gt"),
  lte: Symbol.for("lte"),
  lt: Symbol.for("lt"),
  and: Symbol.for("and"),
  or: Symbol.for("or"),
};
