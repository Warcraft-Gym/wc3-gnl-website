import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAME_CAMP_LINE,
  SPLIT_MODES,
  UNDO_CAP,
  addTarget,
  dropTarget,
  keyOfRow,
  locate,
  moveRow,
  moveRowTo,
  nextStop,
  newRow,
  newSplitRow,
  patchRow,
  placeInList,
  popUndo,
  pushUndo,
  removePath,
  removeRow,
  removeSplit,
  rowAtKey,
  sameCampSequence,
  savedMode,
  setArmLabel,
  stepName,
  stepTarget,
  withSavedModes,
} from "./editor-rows.mjs";

const forkRow = (...arms) => newRow({ split: { mode: "or", arms: arms.map((campIds, i) => ({ id: i, label: "", stops: campIds.map((campId) => newRow({ campId })) })) } });

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
  assert.equal(SPLIT_MODES.length, 2);
  const row = newSplitRow();
  assert.equal(row.split.mode, SPLIT_MODES[0].id);
  assert.deepEqual(row.split.arms.map((a) => a.stops.length), [0, 0]);
  assert.notEqual(row.split.arms[0].id, row.split.arms[1].id);
});

// The builder interaction of v2.7: one rule per move.
const camp = (id) => newRow({ campId: id });
const ids = (list) => list.map((r) => r.campId ?? (r.split ? "split" : r.action));
const pathIds = (rows, i) => rows[i].split.arms.map((a) => a.stops.map((s) => s.campId));
const route = () => [camp("c1"), forkRow(["c2", "c3"], ["c4"]), camp("c5")];

test("mode: the builder stores Choose a path; saving reads or (stops follow) or xor (nothing follows)", () => {
  const rows = route();
  assert.equal(savedMode(rows, 1), "or");
  assert.equal(savedMode(rows.slice(0, 2), 1), "xor");
  const and = [camp("c1"), { ...rows[1], split: { ...rows[1].split, mode: "and" } }];
  assert.equal(savedMode(and, 1), "and");
  assert.deepEqual(withSavedModes(rows.slice(0, 2)).map((r) => r.split?.mode), [undefined, "xor"]);
});

test("add: after the selected row in its own list, into the active path from a caption, else at the end", () => {
  const rows = route();
  const c2 = rows[1].split.arms[0].stops[0];
  assert.deepEqual(addTarget(rows, null), { index: 3 });
  assert.deepEqual(addTarget(rows, { id: rows[0].id }), { index: 1 });
  assert.deepEqual(addTarget(rows, { id: c2.id }), { splitId: rows[1].id, arm: 0, index: 1 });
  assert.deepEqual(addTarget(rows, { id: rows[1].id, arm: 1 }), { splitId: rows[1].id, arm: 1, index: 1 });
  // A split added from inside a path goes after that split; a split never goes into a path.
  assert.deepEqual(addTarget(rows, { id: c2.id }, true), { index: 2 });
  assert.deepEqual(addTarget(rows, { id: rows[1].id, arm: 1 }, true), { index: 2 });
});

test("move: a stop drops between rows, into a path or out of it; the last stop leaving a path leaves it empty", () => {
  const rows = route();
  const c4 = rows[1].split.arms[1].stops[0];
  // c1 down to after c5 (index counted before the move).
  assert.deepEqual(ids(moveRowTo(rows, rows[0].id, { index: 3 })), ["split", "c5", "c1"]);
  // c5 into path a, first.
  const into = moveRowTo(rows, rows[2].id, { splitId: rows[1].id, arm: 0, index: 0 });
  assert.deepEqual(pathIds(into, 1), [["c5", "c2", "c3"], ["c4"]]);
  // c4 out of path b to the top: path b is left empty.
  const out = moveRowTo(rows, c4.id, { index: 0 });
  assert.deepEqual(ids(out), ["c4", "c1", "split", "c5"]);
  assert.deepEqual(pathIds(out, 2), [["c2", "c3"], []]);
  // Down one inside path a, and a drop on its own place changes nothing.
  const c2 = rows[1].split.arms[0].stops[0];
  assert.deepEqual(pathIds(moveRowTo(rows, c2.id, { splitId: rows[1].id, arm: 0, index: 2 }), 1), [["c3", "c2"], ["c4"]]);
  assert.equal(moveRowTo(rows, c2.id, { splitId: rows[1].id, arm: 0, index: 1 }), rows);
});

test("move a split: the whole block moves, and it never lands in a path", () => {
  const rows = route();
  const moved = moveRowTo(rows, rows[1].id, { index: 3 });
  assert.deepEqual(ids(moved), ["c1", "c5", "split"]);
  assert.deepEqual(pathIds(moved, 2), [["c2", "c3"], ["c4"]]);
  assert.equal(moveRowTo(rows, rows[1].id, { splitId: rows[1].id, arm: 0, index: 0 }), rows);
});

// An arrow move is `moveRowTo` to `stepTarget`, the same function a drop calls.
const arrow = (rows, id, dir, shown) => {
  const at = stepTarget(rows, id, dir, shown);
  return at ? moveRowTo(rows, id, at) : rows;
};
const andRow = (...arms) => {
  const r = forkRow(...arms);
  return { ...r, split: { ...r.split, mode: "and" } };
};

test("arrows inside a path: one place up or down in that path", () => {
  const rows = route();
  const [c2, c3] = rows[1].split.arms[0].stops;
  assert.deepEqual(pathIds(arrow(rows, c3.id, -1), 1), [["c3", "c2"], ["c4"]]);
  assert.deepEqual(pathIds(arrow(rows, c2.id, 1), 1), [["c3", "c2"], ["c4"]]);
  assert.equal(stepName(rows, c3.id, -1), "Move up");
  assert.equal(stepName(rows, c2.id, 1), "Move down");
});

test("arrows out of a path: up from its first stop lands above the split, down from its last stop below it", () => {
  for (const make of [route, () => [camp("c1"), andRow(["c2", "c3"], ["c4"]), camp("c5")]]) {
    const rows = make();
    const [c2, c3] = rows[1].split.arms[0].stops;
    assert.deepEqual(ids(arrow(rows, c2.id, -1)), ["c1", "c2", "split", "c5"]);
    assert.deepEqual(pathIds(arrow(rows, c2.id, -1), 2), [["c3"], ["c4"]]);
    assert.deepEqual(ids(arrow(rows, c3.id, 1)), ["c1", "split", "c3", "c5"]);
    assert.equal(stepName(rows, c2.id, -1), "Move out of the split");
    assert.equal(stepName(rows, c3.id, 1), "Move out of the split");
  }
});

test("arrows onto a split from the main list: into the shown path at the near end; path 1 in At the same time", () => {
  const rows = route();
  const split = rows[1].id;
  // Down from above: first in the shown path; up from below: last in it.
  assert.deepEqual(pathIds(arrow(rows, rows[0].id, 1), 0), [["c1", "c2", "c3"], ["c4"]]);
  assert.deepEqual(pathIds(arrow(rows, rows[0].id, 1, { [split]: 1 }), 0), [["c2", "c3"], ["c1", "c4"]]);
  assert.deepEqual(pathIds(arrow(rows, rows[2].id, -1, { [split]: 1 }), 1), [["c2", "c3"], ["c4", "c5"]]);
  assert.deepEqual(stepTarget(rows, rows[2].id, -1, { [split]: 1 }), { splitId: split, arm: 1, index: 1 });
  assert.equal(stepName(rows, rows[0].id, 1, { [split]: 1 }), "Move into path 2");
  // A shown tab past the last path reads as the last path.
  assert.deepEqual(stepTarget(rows, rows[0].id, 1, { [split]: 5 }), { splitId: split, arm: 1, index: 0 });
  // "At the same time" shows every path: a stop enters path 1, the hero's line, whatever tab was last shown.
  const and = [camp("c1"), andRow(["c2"], ["c4"]), camp("c5")];
  assert.deepEqual(pathIds(arrow(and, and[0].id, 1, { [and[1].id]: 1 }), 0), [["c1", "c2"], ["c4"]]);
  assert.deepEqual(pathIds(arrow(and, and[2].id, -1, { [and[1].id]: 1 }), 1), [["c2", "c5"], ["c4"]]);
  assert.equal(stepName(and, and[2].id, -1), "Move into path 1");
  // An empty shown path takes the stop as its only one.
  const empty = [camp("c1"), forkRow(["c2"], [])];
  assert.deepEqual(pathIds(arrow(empty, empty[0].id, 1, { [empty[1].id]: 1 }), 0), [["c2"], ["c1"]]);
});

test("arrows: a split moves as one block, never into a path, and a stop between two splits enters one at a time", () => {
  const two = [forkRow(["c1"], ["c2"]), forkRow(["c3"], ["c4"])];
  assert.deepEqual(arrow(two, two[0].id, 1).map((r) => r.id), [two[1].id, two[0].id]);
  assert.deepEqual(stepTarget(two, two[1].id, -1), { index: 0 });
  assert.equal(stepName(two, two[0].id, 1), "Move down");
  // c1 leaves split 1 downward and lands between the splits; the next press enters split 2.
  const c1 = two[0].split.arms[0].stops[0];
  const between = arrow(two, c1.id, 1);
  assert.deepEqual(ids(between), ["split", "c1", "split"]);
  assert.deepEqual(pathIds(between, 0), [[], ["c2"]]);
  assert.deepEqual(pathIds(arrow(between, c1.id, 1), 1), [["c1", "c3"], ["c4"]]);
  assert.deepEqual(pathIds(arrow(between, c1.id, -1), 0), [["c1"], ["c2"]]);
});

test("arrows at the edges: the first row cannot go up, the last cannot go down, a path's stop always leaves", () => {
  const rows = route();
  assert.equal(stepTarget(rows, rows[0].id, -1), null);
  assert.equal(stepTarget(rows, rows[2].id, 1), null);
  assert.equal(arrow(rows, rows[0].id, -1), rows);
  assert.equal(stepTarget(rows, -1, 1), null);
  // A split first and last: its paths' stops still move out, and a one-stop path goes empty.
  const only = [forkRow(["c2"], ["c4"])];
  const c4 = only[0].split.arms[1].stops[0];
  assert.deepEqual(ids(arrow(only, c4.id, -1)), ["c4", "split"]);
  assert.deepEqual(ids(arrow(only, c4.id, 1)), ["split", "c4"]);
  assert.deepEqual(pathIds(arrow(only, c4.id, 1), 0), [["c2"], []]);
  assert.equal(stepTarget(only, only[0].id, -1), null);
  assert.equal(stepTarget(only, only[0].id, 1), null);
});

test("drop zones: rows before or after, a caption before the split or into the shown path, an empty path, the end", () => {
  const rows = route();
  const stop = rows[0];
  assert.deepEqual(dropTarget(rows, { kind: "row", key: "0", after: false }, stop), { index: 0 });
  assert.deepEqual(dropTarget(rows, { kind: "row", key: "2", after: true }, stop), { index: 3 });
  assert.deepEqual(dropTarget(rows, { kind: "row", key: "1.b.0", after: true }, stop), { splitId: rows[1].id, arm: 1, index: 1 });
  assert.deepEqual(dropTarget(rows, { kind: "caption", index: 1, after: false }, stop), { index: 1 });
  assert.deepEqual(dropTarget(rows, { kind: "caption", index: 1, arm: 1, after: true }, stop), { splitId: rows[1].id, arm: 1, index: 0 });
  assert.deepEqual(dropTarget(rows, { kind: "path", index: 1, arm: 1 }, stop), { splitId: rows[1].id, arm: 1, index: 0 });
  assert.deepEqual(dropTarget(rows, { kind: "end" }, stop), { index: 3 });
  // A dragged split: no zone inside a path lights up; after its caption means after the block.
  const split = rows[1];
  assert.equal(dropTarget(rows, { kind: "row", key: "1.a.0", after: false }, split), null);
  assert.equal(dropTarget(rows, { kind: "path", index: 1, arm: 0 }, split), null);
  assert.equal(dropTarget(rows, { kind: "caption", index: 1, after: true }, split), null);
  assert.deepEqual(dropTarget(rows, { kind: "row", key: "2", after: true }, split), { index: 3 });
});

test("remove a path: the second-last path turns the split into plain stops; remove a split keeps the active path", () => {
  const rows = route();
  assert.deepEqual(ids(removePath(rows, rows[1].id, 0)), ["c1", "c4", "c5"]);
  assert.deepEqual(ids(removePath(rows, rows[1].id, 1)), ["c1", "c2", "c3", "c5"]);
  const three = [camp("c1"), forkRow(["c2"], ["c3"], ["c4"])];
  assert.deepEqual(pathIds(removePath(three, three[1].id, 1), 1), [["c2"], ["c4"]]);
  assert.deepEqual(ids(removeSplit(rows, rows[1].id, 1)), ["c1", "c4", "c5"]);
  assert.deepEqual(ids(removeSplit(rows, rows[1].id)), ["c1", "c2", "c3", "c5"]);
  // Remove a stop reaches a path's stop.
  assert.deepEqual(pathIds(removeRow(rows, rows[1].split.arms[0].stops[1].id), 1), [["c2"], ["c4"]]);
  assert.deepEqual(locate(rows, rows[1].split.arms[1].stops[0].id), { splitId: rows[1].id, arm: 1, index: 0 });
});

test("same camps in every path, same order: allowed, with one line; another order is a real choice", () => {
  assert.equal(sameCampSequence(forkRow(["c05"], ["c05"]).split), true);
  assert.equal(sameCampSequence(forkRow(["c06", "c08"], ["c06", "c08"], ["c06", "c08"]).split), true);
  // Autumn Leaves: the same two camps in another order must not warn.
  assert.equal(sameCampSequence(forkRow(["c06", "c08"], ["c08", "c06"]).split), false);
  assert.equal(sameCampSequence(forkRow(["c5"], ["c5", "c6"]).split), false);
  assert.equal(sameCampSequence(forkRow(["c5"], []).split), false);
  assert.equal(sameCampSequence(forkRow([], []).split), false);
  assert.match(SAME_CAMP_LINE, /^A split is for different places\./);
});

test("a path label keeps what is typed and trims once on blur", () => {
  let rows = route();
  const id = rows[1].id;
  for (const typed of ["C", "Contest", "Contest ", "Contest E", "Contest Elf "]) rows = setArmLabel(rows, id, 0, typed);
  assert.equal(rows[1].split.arms[0].label, "Contest Elf ");
  const fresh = route();
  assert.equal(setArmLabel(fresh, fresh[1].id, 0, "Contest ")[1].split.arms[0].label, "Contest ");
  assert.equal(setArmLabel(rows, id, 0, rows[1].split.arms[0].label, true)[1].split.arms[0].label, "Contest Elf");
});

test("undo: a stack of earlier lists with labels, capped at 50, no redo", () => {
  const a = route();
  const b = removeSplit(a, a[1].id);
  let stack = pushUndo([], a, "remove split");
  assert.deepEqual(stack.map((e) => e.label), ["remove split"]);
  stack = pushUndo(stack, b, "remove stop 2");
  const top = popUndo(stack);
  assert.equal(top.entry.label, "remove stop 2");
  assert.equal(top.entry.rows, b);
  assert.equal(popUndo(top.stack).entry.rows, a);
  assert.equal(popUndo([]), null);
  for (let i = 0; i < 60; i++) stack = pushUndo(stack, a, `edit ${i}`);
  assert.equal(stack.length, UNDO_CAP);
  assert.equal(stack[0].label, "edit 10");
});

test("next-stop row: its label counts itself in, and its line says where the next camp lands", () => {
  const two = [camp("c1"), camp("c2")];
  assert.deepEqual(nextStop(two, addTarget(two, null)), { label: "3", line: "Adds stop 3 at the end.", toEnd: false, after: "after stop 2" });
  assert.deepEqual(nextStop(two, addTarget(two, { id: two[0].id })), { label: "2", line: "Adds stop 2 after stop 1.", toEnd: true, after: "after stop 1" });
  assert.deepEqual(nextStop([], addTarget([], null)), { label: "1", line: "Adds stop 1, your first stop.", toEnd: false, after: "at the start" });
  // A waypoint before it has no number.
  const way = [camp("c1"), newRow({ place: { kind: "shop", at: { shop: "s1" } } }), camp("c2")];
  assert.equal(nextStop(way, addTarget(way, { id: way[1].id })).line, "Adds stop 2 after the waypoint.");
});

test("next-stop row in a path: letters in a pick-one path, the same numbers in a same-time path", () => {
  const rows = [camp("c1"), forkRow(["c2"], ["c3"]), camp("c5")];
  rows[1].split.arms[0].label = "Safe";
  rows[1].split.arms[1].label = " Risky ";
  const inB = addTarget(rows, { id: rows[1].id, arm: 1 });
  assert.deepEqual(nextStop(rows, inB, { [rows[1].id]: 1 }), { label: "3b", line: "Adds stop 3b to path B (Risky).", toEnd: false });
  assert.equal(nextStop(rows, addTarget(rows, { id: rows[1].id, arm: 0 })).line, "Adds stop 3a to path A (Safe).");
  const and = [camp("c1"), { ...rows[1], split: { ...rows[1].split, mode: "and" } }];
  assert.deepEqual(nextStop(and, addTarget(and, { id: and[1].id, arm: 1 })), { label: "3", line: "Adds stop 3 to path 2, without the hero.", toEnd: false });
  assert.equal(nextStop(and, addTarget(and, { id: and[1].id, arm: 0 })).line, "Adds stop 3 to path 1, the hero's.");
});
