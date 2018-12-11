import Op from "../src/operators";
import processWhere from "../src/where";
import InfluxQL from "influx-ql";

test("basic 'and' object", () => {
  const ql = new InfluxQL();
  ql.addMeasurement("test");

  processWhere(ql, {
    [Op.and]: {
      "element1": 1,
      "element2": "1233",
    },
  });
  const query = ql.toSelect();
  expect(query).toBe(`select * from "test" where ("element1" = 1 and "element2" = '1233')`);
});

test("basic 'or' object", () => {
  const ql = new InfluxQL();
  ql.addMeasurement("test");
  processWhere(ql, {
    [Op.or]: [
      {"rawr": 222},
      {"orRar": 3333},
    ],
  });
  const query = ql.toSelect();
  expect(query).toBe(`select * from "test" where ("rawr" = 222 or "orRar" = 3333)`);
});

test("complex 'or' object", () => {
  const ql = new InfluxQL();
  ql.addMeasurement("test");
  processWhere(ql, {
    [Op.or]: [
      {"rawr": 222},
      {"rawr": 3333},
      {"fist": 1},
    ],
  });
  const query = ql.toSelect();
  expect(query).toBe(`select * from "test" where ("rawr" = 222 or "rawr" = 3333 or "fist" = 1)`);
});

test("testing all symbols", () => {
  const ql = new InfluxQL();
  ql.addMeasurement("test");
  processWhere(ql, {
    "rawr": {
      [Op.gt]: 1,
      [Op.gte]: 1,
      [Op.ne]: 1,
      [Op.eq]: 1,
      [Op.lte]: 1,
      [Op.lt]: 1,
    },
  });
  const query = ql.toSelect();
  expect(query).toBe(`select * from "test" where ("rawr" > 1 and "rawr" >= 1 and "rawr" != 1 and "rawr" = 1 and "rawr" <= 1 and "rawr" < 1)`);
});

test("testing all symbols with or", () => {
  const ql = new InfluxQL();
  ql.addMeasurement("test");
  processWhere(ql, {
    [Op.or]: [{
      "rawr": {
        [Op.gt]: 1,
        [Op.gte]: 1,
        [Op.ne]: 1,
        [Op.eq]: 1,
        [Op.lte]: 1,
        [Op.lt]: 1,
      },
    }],
  });
  const query = ql.toSelect();
  expect(query).toBe(`select * from "test" where ("rawr" > 1 or "rawr" >= 1 or "rawr" != 1 or "rawr" = 1 or "rawr" <= 1 or "rawr" < 1)`);
});

test("testing all symbols with 'or' and 'and'", () => {
  const ql = new InfluxQL();
  ql.addMeasurement("test");
  processWhere(ql, {
    [Op.or]: [{
      "rawr": {
        [Op.gt]: 1,
        [Op.gte]: 1,
        [Op.ne]: 1,
        [Op.eq]: 1,
        [Op.lte]: 1,
        [Op.lt]: 1,
      },
    }],
    [Op.and]: [{
      "rawr": {
        [Op.gt]: 1,
        [Op.gte]: 1,
        [Op.ne]: 1,
        [Op.eq]: 1,
        [Op.lte]: 1,
        [Op.lt]: 1,
      },
    }],
  });
  const query = ql.toSelect();
  expect(query).toBe(`select * from "test" where ("rawr" > 1 and "rawr" >= 1 and "rawr" != 1 and "rawr" = 1 and "rawr" <= 1 and "rawr" < 1) and ("rawr" > 1 or "rawr" >= 1 or "rawr" != 1 or "rawr" = 1 or "rawr" <= 1 or "rawr" < 1)`);
});
