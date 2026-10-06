import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILD_SHOWN, ROUTE_SHOWN, buildErrorPlace, routeErrorPlace, unshownErrors } from "./form-errors.mjs";

const shown = (re) => (key) => re.test(key);

test("unshownErrors: keeps only the messages no field shows, named by place", () => {
  const fields = { title: "Give it a proper title", "steps.1.supply": "Max 100", form: "Something is off" };
  assert.deepEqual(unshownErrors(fields, shown(BUILD_SHOWN), buildErrorPlace), ["Something is off", "Step 2, Food: Max 100"]);
});

test("unshownErrors: the fields first, then the stops top to bottom", () => {
  const fields = { "stops.2.note": "Max 600 characters", hero: "Unknown hero icon", "stops.1.campId": "Unknown camp" };
  const where = (key) => key;
  assert.deepEqual(unshownErrors(fields, () => false, where), [
    "hero: Unknown hero icon",
    "stops.1.campId: Unknown camp",
    "stops.2.note: Max 600 characters",
  ]);
});

test("BUILD_SHOWN: the build form's own fields and a step's time and instruction", () => {
  for (const key of ["title", "race", "steps", "steps.0.time", "steps.12.instruction", "supersedes"]) {
    assert.ok(BUILD_SHOWN.test(key), key);
  }
  for (const key of ["steps.0.supply", "steps.0.icon", "form", "website"]) {
    assert.ok(!BUILD_SHOWN.test(key), key);
  }
});

test("ROUTE_SHOWN: setup, details, the stop list, a stop's action and kills, a split's own messages", () => {
  for (const key of [
    "map", "race", "title", "stops", "stops.1.action", "stops.1.kills",
    "stops.2.split", "stops.2.split.arms.0.label", "stops.2.split.arms.1.stops",
    "stops.2.split.arms.1.stops.0.kills",
  ]) {
    assert.ok(ROUTE_SHOWN.test(key), key);
  }
  for (const key of ["level", "start", "hero", "build", "vsRaces", "stops.1.note", "stops.1.campId", "stops.1.units.0.count", "stops.2.split.arms.0.stops.1.note"]) {
    assert.ok(!ROUTE_SHOWN.test(key), key);
  }
});

const camp = (id) => ({ campId: id });
const waypoint = { campId: null, action: "Scout", place: { kind: "scout", at: { start: "1" } } };
const stops = [
  camp("c1"),
  waypoint,
  { campId: null, split: { mode: "or", arms: [{ label: "fast", stops: [camp("c2"), camp("c3")] }, { label: "safe", stops: [camp("c4")] }] } },
  camp("c5"),
];

test("routeErrorPlace: names a stop the way the route list numbers it", () => {
  assert.equal(routeErrorPlace("stops.0.campId", stops), "Stop 1, Camp");
  assert.equal(routeErrorPlace("stops.1.place", stops), "A waypoint, Place");
  assert.equal(routeErrorPlace("stops.2.split.arms.0.stops.1.note", stops), "Stop 3a, Note");
  assert.equal(routeErrorPlace("stops.2.split.arms.1.stops.0.units.0.count", stops), "Stop 2b, Bring");
  assert.equal(routeErrorPlace("stops.2.split.arms.1.label", stops), "Split at stop 2, path b, When to take it");
  assert.equal(routeErrorPlace("stops.3.hero", stops), "Stop 4, Hero");
});

test("routeErrorPlace: a route field by its name; an index past the list is the stops", () => {
  assert.equal(routeErrorPlace("hero", stops), "Hero");
  assert.equal(routeErrorPlace("start", stops), "Your start");
  assert.equal(routeErrorPlace("stops.9.note", stops), "Stops");
  assert.equal(routeErrorPlace("form", stops), "");
});

test("buildErrorPlace: a step by its number", () => {
  assert.equal(buildErrorPlace("steps.0.icon"), "Step 1, Icon");
  assert.equal(buildErrorPlace("difficulty"), "Difficulty");
});
