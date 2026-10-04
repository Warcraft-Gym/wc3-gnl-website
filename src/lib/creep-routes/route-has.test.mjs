import { test } from "node:test";
import assert from "node:assert/strict";
import { routeHas } from "./route-has.mjs";

const camp = (id) => ({ campId: id });
const place = (kind) => ({ campId: null, action: kind, place: { kind, at: { start: "1" } } });
const split = (mode, ...arms) => ({ campId: null, split: { mode, arms: arms.map((stops) => ({ label: "x", stops })) } });
const route = (...stops) => ({ stops });

test("a route of plain camps has none of the features", () => {
  for (const f of ["split", "and", "waypoint", "pin", "attack"]) assert.equal(routeHas(route(camp("c1"), camp("c2")), f), false);
});

test("an or / xor split is a split; an and split is not, and the reverse", () => {
  assert.equal(routeHas(route(split("or", [camp("c1")], [camp("c2")])), "split"), true);
  assert.equal(routeHas(route(split("xor", [camp("c1")], [camp("c2")])), "split"), true);
  assert.equal(routeHas(route(split("and", [camp("c1")], [camp("c2")])), "split"), false);
  assert.equal(routeHas(route(split("and", [camp("c1")], [camp("c2")])), "and"), true);
  assert.equal(routeHas(route(split("or", [camp("c1")], [camp("c2")])), "and"), false);
});

test("a waypoint is a place that is not an attack; an attack is not a waypoint", () => {
  assert.equal(routeHas(route(camp("c1"), place("scout")), "waypoint"), true);
  assert.equal(routeHas(route(camp("c1"), place("attack")), "waypoint"), false);
  assert.equal(routeHas(route(camp("c1"), place("attack")), "attack"), true);
  assert.equal(routeHas(route(camp("c1"), place("build")), "attack"), false);
});

test("a waypoint or an attack inside a split path counts", () => {
  const r = route(camp("c1"), split("xor", [camp("c2")], [place("attack")]), split("and", [place("shop")], [camp("c3")]));
  assert.equal(routeHas(r, "attack"), true);
  assert.equal(routeHas(r, "waypoint"), true);
});

test("a pin is a waypoint whose line is skipped, including inside a split", () => {
  assert.equal(routeHas(route(place("shop")), "pin"), false);
  assert.equal(routeHas(route({ ...place("scout"), hero: false }), "pin"), true);
  assert.equal(routeHas(route(split("and", [camp("c1")], [{ ...place("scout"), hero: false }])), "pin"), true);
});
