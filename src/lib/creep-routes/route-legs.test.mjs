import test from "node:test";
import assert from "node:assert/strict";
import { onTheMap, routeLegs } from "./route-legs.mjs";
import { FIXTURE_ROUTES } from "./fixtures.mjs";

const echo = () => structuredClone(FIXTURE_ROUTES.find((r) => r.slug === "undead-ves-echo-isles").stops);
const pairs = (plan) => plan.legs.map(({ a, b }) => `${a}>${b}`);

test("a waypoint done by another unit is not on the map: no node, no leg (Echo Isles' scout)", () => {
  const stops = echo();
  assert.equal(onTheMap(stops[2]), false);
  // 1 c11, 2 c02, the scout (not drawn), 3 c05, 4 c03: the hero's line runs 2 to 3.
  const plan = routeLegs(stops);
  assert.deepEqual(pairs(plan), ["0>1", "1>3", "3>4"]);
  assert.ok(!plan.nodes.some((n) => n.key === "2"));
});

test("the builder's map still shows it, as any waypoint, so the author can place it", () => {
  const plan = routeLegs(echo(), {}, (s) => Boolean(s.campId || s.place));
  assert.ok(plan.nodes.some((n) => n.key === "2"));
  assert.deepEqual(pairs(plan), ["0>1", "1>2", "2>3", "3>4"]);
});

test("a waypoint the hero walks is on the map with its legs", () => {
  const stops = echo();
  delete stops[2].hero;
  assert.equal(onTheMap(stops[2]), true);
  assert.deepEqual(pairs(routeLegs(stops)), ["0>1", "1>2", "2>3", "3>4"]);
});

test("a split that opens the route starts at your base; and draws every path, the later ones thin", () => {
  const and = [{ campId: null, split: { mode: "and", arms: [{ stops: [{ campId: "c1" }] }, { stops: [{ campId: "c2" }] }] } }, { campId: "c3" }];
  const plan = routeLegs(and);
  assert.deepEqual(plan.legs.map(({ a, b, style }) => `${a}>${b}:${style}`), ["start>0.a.0:solid", "start>0.b.0:thin", "0.a.0>1:solid", "0.b.0>1:thin"]);
  assert.equal(plan.nodes.find((n) => n.key === "0.b.0").absent, true);
});
