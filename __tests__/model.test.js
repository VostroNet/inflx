// import Op from "../src/operators";
import InfluxORM, {Op} from "../src/index";


test("model basic where", () => {
  const instance = new InfluxORM({database: "test"});
  const TestModel = instance.define("Test", {
    measurement: "tmeasure",
    tags: ["testtag"],
    fields: {
      testStr: InfluxORM.Types.STRING,
      testIn: InfluxORM.Types.INTEGER,
    },
  });
  const query = TestModel.createQueryString({
    where: {
      [Op.and]: {
        "testIn": 1,
        "testStr": "1233",
      },
      [Op.or]: [{
        "testtag": 222,
      }, {
        "testtag": 3333,
      }],
    },
  });
  expect(query.toSelect()).toBe(`select * from "test".."tmeasure" where ("testIn" = 1 and "testStr" = '1233') and ("testtag" = 222 or "testtag" = 3333)`);
});


test("model - createQueryString - no where ", () => {
  const instance = new InfluxORM({database: "test"});
  const TestModel = instance.define("Test", {
    measurement: "tmeasure",
    tags: ["testtag"],
    fields: {
      testStr: InfluxORM.Types.STRING,
      testIn: InfluxORM.Types.INTEGER,
    },
  });
  const query = TestModel.createQueryString({});
  expect(query.toSelect()).toBe(`select * from "test".."tmeasure"`);
});



test("model - createQueryString - groups", () => {
  const instance = new InfluxORM({database: "test"});
  const TestModel = instance.define("Test", {
    measurement: "tmeasure",
    tags: ["testtag"],
    fields: {
      testStr: InfluxORM.Types.STRING,
      testIn: InfluxORM.Types.INTEGER,
    },
  });
  const query = TestModel.createQueryString({
    groups: ["time(1d)"],
  });
  expect(query.toSelect()).toBe(`select * from "test".."tmeasure" group by time(1d)`);
});

test("model - createQueryString - options retentionPolicy ", () => {
  const instance = new InfluxORM({database: "test"});
  const TestModel = instance.define("Test", {
    measurement: "tmeasure",
    tags: ["testtag"],
    fields: {
      testStr: InfluxORM.Types.STRING,
      testIn: InfluxORM.Types.INTEGER,
    },
  });
  const query = TestModel.createQueryString({
    retentionPolicy: "testrp"
  });
  // console.log("q", query);
  expect(query.toSelect()).toBe(`select * from "test"."testrp"."tmeasure"`);
});

test("model - createQueryString - define retentionPolicy ", () => {
  const instance = new InfluxORM({database: "test"});
  const TestModel = instance.define("Test", {
    retentionPolicy: "testrp",
    measurement: "tmeasure",
    tags: ["testtag"],
    fields: {
      testStr: InfluxORM.Types.STRING,
      testIn: InfluxORM.Types.INTEGER,
    },
  });
  const query = TestModel.createQueryString({});
  // console.log("q", query);
  expect(query.toSelect()).toBe(`select * from "test"."testrp"."tmeasure"`);
});
