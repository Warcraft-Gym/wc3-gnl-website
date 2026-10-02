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

test("a stop with kills and leaveRest counts only those creeps and reports the rest as left", () => {
  // Only the one level-2 creep of c1: 1 kill at factor 0.8 of creepXp(2).
  const partial = deriveRoute({ stops: [{ campId: "c1", kills: [{ row: 1, n: 1 }], leaveRest: true }] }, MAP);
  const full = deriveRoute({ stops: [{ campId: "c1" }] }, MAP);
  assert.ok(partial.stops[0].xpAfter < full.stops[0].xpAfter);
  assert.equal(partial.stops[0].left, 2);
  assert.equal(full.stops[0].left, 0);
});

test("each stop carries a per-kill trace: xp paid, level after, and the kill that levels up", () => {
  const result = deriveRoute(ROUTE, MAP);
  const [s1, s2, s3] = result.stops;
  assert.deepEqual(s1.kills.map((k) => k.creep.id), ["a", "a", "b"]);
  // Kills sum to the stop's xp gain.
  assert.equal(s1.kills.reduce((sum, k) => sum + k.xp, 0), s1.xpAfter);
  assert.equal(s2.kills.reduce((sum, k) => sum + k.xp, 0), s2.xpAfter - s1.xpAfter);
  // Exactly one kill in stop 2 crosses into level 2, and it is flagged.
  const ups = s2.kills.filter((k) => k.leveledUp);
  assert.equal(ups.length, 1);
  assert.equal(ups[0].levelAfter, 2);
  assert.equal(s2.kills.at(-1).levelAfter, s2.heroLevelAfter);
  assert.deepEqual(s3.kills, []);
});

test("the kill trace follows the stop's kill order and pays less after a level-up", () => {
  const map = {
    camps: [{ id: "c1", level: 18, band: "hard", creeps: [{ id: "f", name: "F", level: 6, count: 3 }] }],
  };
  const result = deriveRoute({ stops: [{ campId: "c1", kills: [{ row: 0, n: 3 }] }] }, map);
  assert.deepEqual(result.stops[0].kills.map((k) => [k.xp, k.levelAfter, k.leveledUp]), [
    [120, 1, false],
    [120, 2, true],
    [105, 2, false],
  ]);
});

test("a prefix-only stop kills its prefix first, then the rest, and flags which kills were ordered", () => {
  const result = deriveRoute({ stops: [{ campId: "c1", kills: [{ row: 1, n: 1 }] }] }, MAP);
  const [stop] = result.stops;
  assert.deepEqual(stop.kills.map((k) => [k.creep.id, k.row, k.ordered]), [["b", 1, true], ["a", 0, false], ["a", 0, false]]);
  assert.equal(stop.left, 0);
  // Same creeps as a full clear, so the same total xp in this case (no mid-camp level-up).
  assert.equal(stop.xpAfter, deriveRoute({ stops: [{ campId: "c1" }] }, MAP).stops[0].xpAfter);
});

test("kills outside the camp or past a row's count are ignored: ordered flags and left match the real kills", () => {
  const out = deriveRoute({ stops: [{ campId: "c1", kills: [{ row: 7, n: 1 }] }] }, MAP).stops[0];
  assert.deepEqual(out.kills.map((k) => [k.row, k.ordered]), [[0, false], [0, false], [1, false]]);
  // With leaveRest, a list of only unknown rows is no kill order: the creeps stay.
  assert.equal(deriveRoute({ stops: [{ campId: "c1", kills: [{ row: 7, n: 1 }], leaveRest: true }] }, MAP).stops[0].left, 3);
  const mixed = deriveRoute({ stops: [{ campId: "c1", kills: [{ row: 7, n: 1 }, { row: 1, n: 1 }] }] }, MAP).stops[0];
  assert.deepEqual(mixed.kills.map((k) => [k.row, k.ordered]), [[1, true], [0, false], [0, false]]);
  const over = deriveRoute({ stops: [{ campId: "c1", kills: [{ row: 0, n: 5 }] }] }, MAP).stops[0];
  assert.equal(over.kills.length, 3);
  assert.equal(over.left, 0);
});

test("derived kills carry their unit and whether it is a set; a leading set keeps list order", () => {
  const result = deriveRoute({ stops: [{ campId: "c1", kills: [{ row: 1, n: 1, set: 0 }, { row: 0, n: 1, set: 0 }] }] }, MAP);
  assert.deepEqual(result.stops[0].kills.map((k) => [k.creep.id, k.unit, k.inSet, k.ordered]), [
    ["b", 0, true, true],
    ["a", 0, true, true],
    ["a", 1, true, false],
  ]);
});

test("a stop without the hero (hero: false) earns hero xp like any other: xp is global", () => {
  const withHero = deriveRoute({ stops: [{ campId: "c1" }, { campId: "c2" }] }, MAP);
  const result = deriveRoute({ stops: [{ campId: "c1" }, { campId: "c2", hero: false }] }, MAP);
  const absent = result.stops[1];
  assert.ok(absent.kills.length > 0 && absent.kills.every((k) => k.xp > 0));
  assert.deepEqual(absent.kills.map((k) => k.xp), withHero.stops[1].kills.map((k) => k.xp));
  assert.equal(absent.xpAfter, withHero.stops[1].xpAfter);
  assert.equal(result.finalXp, withHero.finalXp);
});

// A fork (choose one) or a parallel node (all at once) after c1, then c2.
const forkRoute = (kind) => ({
  stops: [
    { campId: "c1" },
    kind === "fork"
      ? { campId: null, split: { mode: "or", arms: [{ label: "A", stops: [{ campId: "c2" }] }, { label: "B", stops: [] }] } }
      : { campId: null, split: { mode: "and", arms: [{ stops: [{ campId: "c2" }] }, { stops: [] }] } },
    { campId: "c2" },
  ],
});
const arms = (route) => route.stops[1].split.arms;

test("or split: the hero walks the chosen arm; the other arm is derived but feeds no total", () => {
  const route = forkRoute("fork");
  arms(route)[1].stops = [{ campId: "c1" }];
  const first = deriveRoute(route, MAP);
  const fork = first.stops[1].split;
  assert.equal(fork.walked, 0);
  assert.equal(fork.arms[0].xpAfter, 306);
  assert.equal(fork.arms[1].stops[0].armIndex, 1);
  assert.equal(fork.arms[1].stops[0].forkKey, "1");
  assert.equal(first.stops[1].xpAfter, 306);

  const second = deriveRoute(route, MAP, { choice: { 1: 1 } });
  assert.equal(second.stops[1].split.walked, 1);
  assert.equal(second.stops[1].xpAfter, second.stops[1].split.arms[1].xpAfter);
  assert.ok(second.stops[1].xpAfter < first.stops[1].xpAfter);
});

test("and split: every arm earns xp, arms 1.. carry no hero and add up after arm 0", () => {
  const route = forkRoute("parallel");
  arms(route)[1].stops = [{ campId: "c2", hero: true }];
  const result = deriveRoute(route, MAP, { choice: { 1: 1 } });
  const node = result.stops[1].split;
  assert.equal(node.walked, 0);
  assert.equal(node.arms[1].stops[0].hero, false);
  assert.ok(node.arms[1].stops[0].kills.every((k) => k.xp > 0));
  assert.equal(node.arms[0].xpAfter, 306);
  // Way b runs on from way a's total, and the stop after the split from way b's.
  const bGain = node.arms[1].stops[0].kills.reduce((n, k) => n + k.xp, 0);
  assert.equal(node.arms[1].xpAfter, 306 + bGain);
  assert.equal(result.stops[1].xpAfter, node.arms[1].xpAfter);
});

test("and split: one XP event, the block's total and the level after it for the join row", () => {
  const route = forkRoute("parallel");
  arms(route)[1].stops = [{ campId: "c2" }];
  const node = deriveRoute(route, MAP).stops[1].split;
  // The hero enters at 128 xp, level 1; both paths together pay the block's total.
  assert.equal(node.levelBefore, 1);
  assert.equal(node.xpBefore, 128);
  assert.equal(node.xpGained, node.arms[1].xpAfter - 128);
  assert.equal(node.levelAfter, deriveRoute(route, MAP).stops[1].heroLevelAfter);
  assert.ok(node.levelAfter > node.levelBefore);
  // An empty block pays nothing and keeps the level.
  const idle = deriveRoute(forkRoute("parallel"), MAP).stops[1].split;
  assert.equal(idle.xpGained, 306 - 128);
  arms(route)[0].stops = [];
  arms(route)[1].stops = [];
  const none = deriveRoute(route, MAP).stops[1].split;
  assert.equal(none.xpGained, 0);
  assert.equal(none.levelAfter, none.levelBefore);
});

test("the stop after a split continues from the chosen arm's total", () => {
  const route = forkRoute("fork");
  arms(route)[1].stops = [{ campId: null, action: "Harass" }];
  const viaA = deriveRoute(route, MAP);
  const viaB = deriveRoute(route, MAP, { choice: { 1: 1 } });
  assert.equal(viaB.stops[1].xpAfter, 128);
  // The hero arrives at level 1 via B, level 2 via A: B's first kill pays the higher factor.
  assert.ok(viaB.stops[2].kills[0].xp > viaA.stops[2].kills[0].xp);
  assert.ok(viaB.finalXp > 128 && viaB.finalXp < viaA.finalXp);
});

test("creeps stay: no kill order with leaveRest kills nothing, grants no xp and leaves every creep", () => {
  const result = deriveRoute({ stops: [{ campId: "c1" }, { campId: "c2", kills: [], leaveRest: true }] }, MAP);
  const stay = result.stops[1];
  assert.equal(stay.kills.length, 0);
  assert.equal(stay.xpAfter, result.stops[0].xpAfter);
  assert.equal(stay.left, MAP.camps.find((c) => c.id === "c2").creeps.reduce((n, c) => n + c.count, 0));
  // Without leaveRest an empty kill order is still the whole camp.
  assert.equal(deriveRoute({ stops: [{ campId: "c2", kills: [] }] }, MAP).stops[0].left, 0);
});
