import test from "node:test";
import assert from "node:assert/strict";
import { offTheLine, routeLegs } from "./route-legs.mjs";
import { FIXTURE_ROUTES } from "./fixtures.mjs";

const echo = () => structuredClone(FIXTURE_ROUTES.find((r) => r.slug === "undead-ves-echo-isles").stops);
const pairs = (plan) => plan.legs.map(({ a, b }) => `${a}>${b}`);

test("a waypoint done by another unit keeps its disc but gets no leg: Echo Isles' scout", () => {
  const stops = echo();
  assert.equal(offTheLine(stops[2]), true);
  // Path a: 1 c11, 2 c02, the scout (no leg), then the shop waypoint and 3 c03.
  const a = routeLegs(stops);
  assert.deepEqual(pairs(a), ["0>1", "1>3.a.0", "3.a.0>4"]);
  assert.ok(a.nodes.some((n) => n.key === "2"));
  // Path b: 2 runs straight to 3b, then 4.
  assert.deepEqual(pairs(routeLegs(stops, { 3: 1 })), ["0>1", "1>3.b.0", "3.b.0>4"]);
});

test("a waypoint the hero walks keeps its legs", () => {
  const stops = echo();
  delete stops[2].hero;
  assert.equal(offTheLine(stops[2]), false);
  assert.deepEqual(pairs(routeLegs(stops)), ["0>1", "1>2", "2>3.a.0", "3.a.0>4"]);
});

test("a split that opens the route starts at your base; and draws every path, the later ones thin", () => {
  const and = [{ campId: null, split: { mode: "and", arms: [{ stops: [{ campId: "c1" }] }, { stops: [{ campId: "c2" }] }] } }, { campId: "c3" }];
  const plan = routeLegs(and);
  assert.deepEqual(plan.legs.map(({ a, b, style }) => `${a}>${b}:${style}`), ["start>0.a.0:solid", "start>0.b.0:thin", "0.a.0>1:solid", "0.b.0>1:thin"]);
  assert.equal(plan.nodes.find((n) => n.key === "0.b.0").absent, true);
});
