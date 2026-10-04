import test from "node:test";
import assert from "node:assert/strict";
import { routeLegs } from "./route-legs.mjs";
import { FIXTURE_ROUTES } from "./fixtures.mjs";

const echo = () => structuredClone(FIXTURE_ROUTES.find((r) => r.slug === "undead-ves-echo-isles").stops);
const pairs = (plan) => plan.legs.map(({ a, b }) => `${a}>${b}`);

test("a pin is drawn with no legs; the legs join its neighbours (Echo Isles' scout)", () => {
  // 1 c11, 2 c02, the pin, 3 c05, 4 c03: the line runs 2 to 3.
  const plan = routeLegs(echo());
  assert.deepEqual(pairs(plan), ["0>1", "1>3", "3>4"]);
  assert.equal(plan.nodes.find((n) => n.key === "2").pin, true);
});

test("a waypoint on the route is on the line", () => {
  const stops = echo();
  delete stops[2].hero;
  const plan = routeLegs(stops);
  assert.deepEqual(pairs(plan), ["0>1", "1>2", "2>3", "3>4"]);
  assert.equal(plan.nodes.find((n) => n.key === "2").pin, false);
});

test("a pin in a path: a node, and the path's legs skip it", () => {
  const pin = { campId: null, action: "Scout", place: { kind: "scout", at: { x: 0.5, y: 0.5 } }, hero: false };
  const stops = [{ campId: "c1" }, { campId: null, split: { mode: "or", arms: [{ label: "A", stops: [pin, { campId: "c2" }] }, { label: "B", stops: [{ campId: "c3" }] }] } }, { campId: "c4" }];
  const plan = routeLegs(stops);
  assert.deepEqual(pairs(plan), ["0>1.a.1", "1.a.1>2"]);
  assert.equal(plan.nodes.find((n) => n.key === "1.a.0").pin, true);
});

test("a split that opens the route starts at your base; and draws every path, the later ones thin", () => {
  const and = [{ campId: null, split: { mode: "and", arms: [{ stops: [{ campId: "c1" }] }, { stops: [{ campId: "c2" }] }] } }, { campId: "c3" }];
  const plan = routeLegs(and);
  assert.deepEqual(plan.legs.map(({ a, b, style }) => `${a}>${b}:${style}`), ["start>0.a.0:solid", "start>0.b.0:thin", "0.a.0>1:solid", "0.b.0>1:thin"]);
  assert.equal(plan.nodes.find((n) => n.key === "0.b.0").absent, true);
});
