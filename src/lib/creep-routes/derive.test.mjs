import assert from "node:assert/strict";
import test from "node:test";
import { deriveRoute, routeBounds } from "./derive.mjs";

// Same worked example as xp.test.mjs's heroLevelAfter test: camps of creep
// levels [3,3,2] then [4,4,3], from hero level 1 -> 128 xp (still L1), then
// 312 xp (L2).
const MAP = {
  slug: "test-map",
  camps: [
    {
      id: "c1",
      level: 8,
      xp: 125,
      band: "medium",
      creeps: [
        { id: "a", name: "A", level: 3, count: 2 },
        { id: "b", name: "B", level: 2, count: 1 },
      ],
    },
    {
      id: "c2",
      level: 11,
      xp: 205,
      band: "hard",
      creeps: [
        { id: "c", name: "C", level: 4, count: 2 },
        { id: "d", name: "D", level: 3, count: 1 },
      ],
    },
  ],
};

const ROUTE = {
  slug: "test-route",
  stops: [
    { campId: "c1", time: 15 },
    { campId: "c2", time: 75 },
    { campId: null, time: 100, action: "TP home" },
  ],
};

test("deriveRoute folds camps in order, matching xp.mjs's worked example", () => {
  const result = deriveRoute(ROUTE, MAP);
  assert.equal(result.stops.length, 3);

  assert.equal(result.stops[0].heroLevelAfter, 1);
  assert.equal(result.stops[0].xpAfter, 128);
  assert.equal(result.stops[0].campLevel, 8);
  assert.equal(result.stops[0].band, "medium");
  assert.equal(result.stops[0].camp.id, "c1");

  assert.equal(result.stops[1].heroLevelAfter, 2);
  assert.equal(result.stops[1].xpAfter, 312);
  assert.equal(result.stops[1].campLevel, 11);

  // A non-camp stop (campId: null) passes through without changing level/xp.
  assert.equal(result.stops[2].campId, null);
  assert.equal(result.stops[2].camp, null);
  assert.equal(result.stops[2].campLevel, null);
  assert.equal(result.stops[2].band, null);
  assert.equal(result.stops[2].heroLevelAfter, 2);
  assert.equal(result.stops[2].xpAfter, 312);

  assert.equal(result.finalLevel, 2);
  assert.equal(result.finalXp, 312);
  assert.equal(result.lastTime, 100);
});

test("deriveRoute attaches the day clock and night flag per stop", () => {
  const result = deriveRoute(ROUTE, MAP);
  assert.equal(result.stops[0].dayClock, "12:45");
  assert.equal(result.stops[0].isNight, false);
});

test("routeBounds reports first/last time and stop count", () => {
  assert.deepEqual(routeBounds(ROUTE), { firstTime: 15, lastTime: 100, stopCount: 3 });
});

test("routeBounds on an empty route", () => {
  assert.deepEqual(routeBounds({ stops: [] }), { firstTime: 0, lastTime: 0, stopCount: 0 });
});
