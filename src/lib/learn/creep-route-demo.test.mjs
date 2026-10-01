import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveRoute } from "../creep-routes/derive.mjs";
import { FIXTURE_MAPS } from "../creep-routes/fixtures.mjs";
import { killsProblem } from "../creep-routes/kills.mjs";
import { CREEP_ROUTE_DEMO as demo } from "./creep-route-demo.mjs";

const map = FIXTURE_MAPS.find((m) => m.slug === demo.map);
const campOf = (id) => map.camps.find((c) => c.id === id);

test("every stop and preset is a valid kill list for its camp", () => {
  const zoomCamp = campOf(demo.stops[demo.zoom.stop].campId);
  for (const { campId, kills } of demo.stops) {
    const camp = campOf(campId);
    assert.ok(camp, campId);
    assert.equal(killsProblem(kills, camp.creeps.map((c) => c.count)), null, campId);
  }
  for (const { kills } of demo.zoom.presets) assert.equal(killsProblem(kills, zoomCamp.creeps.map((c) => c.count)), null);
  assert.deepEqual(demo.zoom.presets[0].kills, demo.stops[demo.zoom.stop].kills, "the first preset is the route's order");
});

test("the preset labels name the right rows of the zoomed camp", () => {
  const names = campOf(demo.stops[demo.zoom.stop].campId).creeps.map((c) => c.name);
  assert.deepEqual(names, ["Ice Troll Trapper", "Frost Wolf", "Forest Troll High Priest", "Sasquatch"]);
});

test("the route levels the hero inside the last stop's box", () => {
  const last = deriveRoute({ stops: demo.stops }, map).stops.at(-1);
  const up = last.kills.find((k) => k.leveledUp);
  assert.equal(up?.inSet, true);
  assert.equal(last.heroLevelAfter, 3);
});
