import InfluxORM, {Op} from "../src/index";


test("retention polies", async() => {
  const instance = new InfluxORM({
    database: "taringa",
    retentionPolicies: {
      ["7d"]: {
        duration: "7d",
      },
      ["1h"]: {
        duration: "1h",
        isDefault: true,
      },
    }
  });
  await instance.sync();

  expect(1).toBe(1);
});


test("continuous queries", async() => {
  const instance = new InfluxORM({
    database: "taringa",
    continuousQueries: {
      "downsample-1h-data": `SELECT MAX("input"), MAX("output"), "deviceId", "userId" INTO "7d"."device-usage" FROM "1h"."device-usage" GROUP BY time(15m)`,
    }
  });
  await instance.sync();
  expect(1).toBe(1);
});
