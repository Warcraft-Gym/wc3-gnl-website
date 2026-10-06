import test from "node:test";
import assert from "node:assert/strict";
import { routeLegs } from "./route-legs.mjs";
import { deriveRoute } from "./derive.mjs";
import { FIXTURE_MAPS } from "./fixtures.mjs";

const MAP = FIXTURE_MAPS.find((m) => m.slug === "autumn-leaves");
const shop = { campId: null, action: "Shop", place: { kind: "shop", at: { x: 0.5, y: 0.5 } } };

/** A take-all block between two camps; `a` and `b` are its two paths. */
const takeAll = (a, b) => [{ campId: "c05" }, { campId: null, split: { mode: "and", arms: [{ stops: a }, { stops: b }] } }, { campId: "c07" }];
const legs = (stops) => routeLegs(stops).legs.map(({ a, b, style }) => `${a}>${b}:${style}`);
const absent = (stops) => routeLegs(stops).nodes.map((n) => `${n.key}:${n.absent}`);
/** Every stop's level, xp and kill xp, the block's totals, and the route's end. */
const numbers = (stops) => {
  const d = deriveRoute({ stops }, MAP);
  const one = (s) => `${s.campId}:${s.heroLevelAfter}/${s.xpAfter}/${s.kills.map((k) => k.xp).join("+")}`;
  const rows = d.stops.flatMap((s) =>
    s.split ? [`block:${s.split.levelBefore}/${s.split.xpBefore}/${s.split.levelAfter}/${s.split.xpGained}`, ...s.split.arms.flatMap((arm) => arm.stops.map(one))] : [one(s)],
  );
  return [...rows, `end:${d.finalLevel}/${d.finalXp}`];
};

// The stored shape of the take-all routes on production: path 1's stops carry no `hero`, every camp of path 2 `hero: false`.
const stored = () => takeAll([{ campId: "c01" }, shop, { campId: "c03" }], [{ campId: "c06", hero: false }, { campId: "c04", hero: false }]);

test("a stored take-all route: path 1 is the main line, path 2 thin and without the hero", () => {
  assert.deepEqual(legs(stored()), ["0>1.a.0:solid", "1.a.0>1.a.1:solid", "1.a.1>1.a.2:solid", "0>1.b.0:thin", "1.b.0>1.b.1:thin", "1.a.2>2:solid", "1.b.1>2:thin"]);
  assert.deepEqual(absent(stored()), ["0:false", "1.a.0:false", "1.a.1:false", "1.a.2:false", "1.b.0:true", "1.b.1:true", "2:false"]);
  assert.deepEqual(numbers(stored()), [
    "c05:1/148/48+32+68",
    "block:1/148/3/719",
    "c01:2/463/92+105+59+59",
    "null:2/463/",
    "c03:3/615/80+36+36",
    "c06:3/726/36+51+24",
    "c04:3/867/69+36+36",
    "c07:4/1008/69+42+30",
    "end:4/1008",
  ]);
});

test("hero on path 2 only: path 2 is the main line, path 1 thin", () => {
  const stops = takeAll([{ campId: "c01", hero: false }, { campId: "c03", hero: false }], [{ campId: "c06" }, { campId: "c04" }]);
  assert.deepEqual(legs(stops), ["0>1.a.0:thin", "1.a.0>1.a.1:thin", "0>1.b.0:solid", "1.b.0>1.b.1:solid", "1.a.1>2:thin", "1.b.1>2:solid"]);
  assert.deepEqual(absent(stops), ["0:false", "1.a.0:true", "1.a.1:true", "1.b.0:false", "1.b.1:false", "2:false"]);
});

test("hero on both paths draws both as the main line; on none, both thin", () => {
  const both = takeAll([{ campId: "c01" }], [{ campId: "c06" }]);
  assert.deepEqual(legs(both), ["0>1.a.0:solid", "0>1.b.0:solid", "1.a.0>2:solid", "1.b.0>2:solid"]);
  const none = takeAll([{ campId: "c01", hero: false }], [{ campId: "c06", hero: false }]);
  assert.deepEqual(legs(none), ["0>1.a.0:thin", "0>1.b.0:thin", "1.a.0>2:thin", "1.b.0>2:thin"]);
  assert.deepEqual(absent(none), ["0:false", "1.a.0:true", "1.b.0:true", "2:false"]);
});

test("a path with the hero on one of its stops has the hero; mixed stops keep their own flags", () => {
  const stops = takeAll([{ campId: "c01" }], [{ campId: "c06", hero: false }, { campId: "c04" }]);
  assert.deepEqual(legs(stops), ["0>1.a.0:solid", "0>1.b.0:solid", "1.b.0>1.b.1:solid", "1.a.0>2:solid", "1.b.1>2:solid"]);
  assert.deepEqual(absent(stops), ["0:false", "1.a.0:false", "1.b.0:true", "1.b.1:false", "2:false"]);
});

test("a path of waypoints only falls back to position: path 1 with the hero, later paths without", () => {
  const scout = { campId: null, action: "Scout", place: { kind: "scout", at: { x: 0.4, y: 0.4 } } };
  assert.deepEqual(legs(takeAll([shop], [scout])), ["0>1.a.0:solid", "0>1.b.0:thin", "1.a.0>2:solid", "1.b.0>2:thin"]);
  // A camp on path 2 with the hero on makes it a main line, even when path 1 holds only a waypoint.
  assert.deepEqual(legs(takeAll([shop], [{ campId: "c06" }])), ["0>1.a.0:solid", "0>1.b.0:solid", "1.a.0>2:solid", "1.b.0>2:solid"]);
});

test("the hero flag moves no number: the stored route and its flipped twin derive the same", () => {
  const flipped = takeAll([{ campId: "c01", hero: false }, shop, { campId: "c03", hero: false }], [{ campId: "c06" }, { campId: "c04" }]);
  assert.deepEqual(numbers(flipped), numbers(stored()));
});
