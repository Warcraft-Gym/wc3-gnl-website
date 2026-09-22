import assert from "node:assert/strict";
import test from "node:test";
import { deriveRoute } from "./derive.mjs";

// Same worked example as xp.test.mjs's heroLevelAfter test: camps of creep
// levels [3,3,2] then [4,4,3], from hero level 1 -> 128 xp (still L1), then
// 306 xp (L2) — the reduction factor is re-read at the hero's current level
// on every kill, not fixed once per camp (see docs/creep-routes.md's "XP
// model").
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
    { campId: "c1" },
    { campId: "c2" },
    { campId: null, action: "TP home" },
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
  assert.equal(result.stops[1].xpAfter, 306);
  assert.equal(result.stops[1].campLevel, 11);

  // A non-camp stop (campId: null) passes through without changing level/xp.
  assert.equal(result.stops[2].campId, null);
  assert.equal(result.stops[2].camp, null);
  assert.equal(result.stops[2].campLevel, null);
  assert.equal(result.stops[2].band, null);
  assert.equal(result.stops[2].heroLevelAfter, 2);
  assert.equal(result.stops[2].xpAfter, 306);

  assert.equal(result.finalLevel, 2);
  assert.equal(result.finalXp, 306);
});

test("deriveRoute floors XP per creep grant, same as xp.mjs's heroLevelAfter: a level-4 creep at hero level 4 grants floor(85 * 0.5) = 42, not 42.5", () => {
  const map = {
    slug: "test-map",
    camps: [
      {
        id: "c1",
        level: 4,
        xp: 85,
        band: "easy",
        creeps: [{ id: "e", name: "E", level: 4, count: 1 }],
      },
    ],
  };
  const route = { slug: "test-route", stops: [{ campId: "c1" }] };
  const result = deriveRoute(route, map, { startLevel: 4 });
  assert.equal(result.stops[0].xpAfter, 942);
  assert.equal(Number.isInteger(result.stops[0].xpAfter), true);
});

test("deriveRoute re-reads the reduction factor mid-camp: leveling up partway through a camp pays the new, lower factor for its remaining kills", () => {
  // Three level-6 creeps in one camp, from level 1: the first two kills
  // (0.8 factor each) cross the level-2 threshold (100 -> 200 xp needed),
  // so the third kill pays the level-2 factor (0.7), not 0.8 — a fixed
  // per-camp factor (the pre-F007 bug) would have given 360, not 345.
  const map = {
    slug: "test-map",
    camps: [
      {
        id: "c1",
        level: 18,
        xp: 450,
        band: "hard",
        creeps: [{ id: "f", name: "F", level: 6, count: 3 }],
      },
    ],
  };
  const route = { slug: "test-route", stops: [{ campId: "c1" }] };
  const result = deriveRoute(route, map, { startLevel: 1 });
  // floor(150*.8) + floor(150*.8) + floor(150*.7) = 120 + 120 + 105 = 345
  assert.equal(result.finalXp, 345);
  assert.equal(result.finalLevel, 2);
});
