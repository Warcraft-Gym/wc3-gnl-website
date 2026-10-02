import { test } from "node:test";
import assert from "node:assert/strict";
import { newRow, toggleCamp, toggleCampAnywhere } from "./editor-rows.mjs";

const forkRow = (...arms) => newRow({ fork: { mode: "either", arms: arms.map((campIds, i) => ({ id: i, label: "", stops: campIds.map((campId) => newRow({ campId })) })) } });

test("toggleCamp adds a camp, and removes it on a second click", () => {
  const once = toggleCamp([], "c1");
  assert.deepEqual(once.map((r) => r.campId), ["c1"]);
  assert.deepEqual(toggleCamp(once, "c1"), []);
});

test("toggleCampAnywhere: a camp in a fork way is removed from that way, not added again at the top", () => {
  const rows = [newRow({ campId: "c1" }), forkRow(["c2"], ["c3"])];
  const next = toggleCampAnywhere(rows, "c3");
  assert.equal(next.length, 2);
  assert.deepEqual(next[1].fork.arms.map((a) => a.stops.map((s) => s.campId)), [["c2"], []]);
  assert.deepEqual(toggleCampAnywhere(rows, "c1").map((r) => r.campId), [null]);
  assert.deepEqual(toggleCampAnywhere(rows, "c9").map((r) => r.campId), ["c1", null, "c9"]);
});
