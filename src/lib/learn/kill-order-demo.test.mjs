import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveRoute } from "../creep-routes/derive.mjs";
import { FIXTURE_MAPS } from "../creep-routes/fixtures.mjs";
import { KILL_ORDER_DEMO } from "./kill-order-demo.mjs";

const map = FIXTURE_MAPS.find((m) => m.slug === KILL_ORDER_DEMO.map);

/** The derived stop for one of the guide's presets, from a level 1 hero. */
function run(label) {
  const { kills, leaveRest } = KILL_ORDER_DEMO.presets.find((p) => p.label === label);
  return deriveRoute({ stops: [{ campId: KILL_ORDER_DEMO.camp, kills, leaveRest }] }, map).stops[0];
}

test("the demo camp has the rows the presets name", () => {
  const camp = map.camps.find((c) => c.id === KILL_ORDER_DEMO.camp);
  assert.deepEqual(
    camp.creeps.map((c) => c.name),
    ["Ice Troll Trapper", "Frost Wolf", "Forest Troll High Priest", "Sasquatch"],
  );
  assert.ok(camp.creeps[3].drops?.length, "the Sasquatch carries the item");
});

test("priest first: the level comes inside the last box, 240 XP", () => {
  const d = run("Priest first");
  assert.equal(d.kills[0].creep.name, "Forest Troll High Priest");
  assert.equal(d.kills[0].inSet, false);
  const up = d.kills.filter((k) => k.leveledUp);
  assert.equal(up.length, 1);
  assert.equal(up[0].inSet, true);
  assert.equal(d.kills.at(-1).leveledUp, true);
  assert.deepEqual([d.heroLevelAfter, d.xpAfter], [2, 240]);
});

test("priest, Sasquatch: level 2 inside the last box, the last creep pays 70%, 236 XP", () => {
  const d = run("Priest, Sasquatch");
  assert.deepEqual(d.kills.slice(0, 2).map((k) => k.creep.name), ["Forest Troll High Priest", "Sasquatch"]);
  assert.equal(d.kills.find((k) => k.leveledUp).inSet, true);
  assert.equal(d.kills.at(-1).xp, Math.floor(40 * 0.7));
  assert.deepEqual([d.heroLevelAfter, d.xpAfter], [2, 236]);
});
