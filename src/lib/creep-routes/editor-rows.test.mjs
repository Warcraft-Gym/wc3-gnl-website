import { test } from "node:test";
import assert from "node:assert/strict";
import { SPLIT_MODES, keyOfRow, moveRow, newRow, newSplitRow, patchRow, placeInList, removeRow, rowAtKey, toggleCamp, toggleCampAnywhere } from "./editor-rows.mjs";

const forkRow = (...arms) => newRow({ split: { mode: "or", arms: arms.map((campIds, i) => ({ id: i, label: "", stops: campIds.map((campId) => newRow({ campId })) })) } });

test("toggleCamp adds a camp, and removes it on a second click", () => {
  const once = toggleCamp([], "c1");
  assert.deepEqual(once.map((r) => r.campId), ["c1"]);
  assert.deepEqual(toggleCamp(once, "c1"), []);
});

test("toggleCampAnywhere: a camp in a fork way is removed from that way, not added again at the top", () => {
  const rows = [newRow({ campId: "c1" }), forkRow(["c2"], ["c3"])];
  const next = toggleCampAnywhere(rows, "c3");
  assert.equal(next.length, 2);
  assert.deepEqual(next[1].split.arms.map((a) => a.stops.map((s) => s.campId)), [["c2"], []]);
  assert.deepEqual(toggleCampAnywhere(rows, "c1").map((r) => r.campId), [null]);
  assert.deepEqual(toggleCampAnywhere(rows, "c9").map((r) => r.campId), ["c1", null, "c9"]);
});

test("rows by key: a path's stop has the stop list's key, and patch, move and remove reach it", () => {
  const rows = [newRow({ campId: "c1" }), forkRow(["c2", "c4"], ["c3"])];
  const c4 = rows[1].split.arms[0].stops[1];
  assert.equal(keyOfRow(rows, rows[0].id), "0");
  assert.equal(keyOfRow(rows, c4.id), "1.a.1");
  assert.equal(keyOfRow(rows, -1), null);
  assert.equal(rowAtKey(rows, "1.a.1"), c4);
  assert.equal(rowAtKey(rows, "1.b.0").campId, "c3");
  assert.equal(patchRow(rows, c4.id, { note: "x" })[1].split.arms[0].stops[1].note, "x");
  assert.deepEqual(moveRow(rows, c4.id, -1)[1].split.arms[0].stops.map((s) => s.campId), ["c4", "c2"]);
  assert.deepEqual(moveRow(rows, rows[0].id, 1).map((r) => r.campId), [null, "c1"]);
  assert.deepEqual(removeRow(rows, c4.id)[1].split.arms[0].stops.map((s) => s.campId), ["c2"]);
  assert.deepEqual(placeInList(rows, c4.id), { index: 1, length: 2 });
});

test("a new split is \"Choose a path\", the first mode chip, with two empty paths", () => {
  assert.equal(SPLIT_MODES[0].label, "Choose a path");
  assert.equal(SPLIT_MODES.at(-1).label, "At the same time");
  const row = newSplitRow();
  assert.equal(row.split.mode, SPLIT_MODES[0].id);
  assert.deepEqual(row.split.arms.map((a) => a.stops.length), [0, 0]);
  assert.notEqual(row.split.arms[0].id, row.split.arms[1].id);
});
