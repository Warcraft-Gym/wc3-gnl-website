import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAME_CAMP_LINE,
  SPLIT_MODES,
  UNDO_CAP,
  ROUTE_END,
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
  targetExists,
  firstErrorAt,
  targetAfterAdd,
  targetAfterRemovePath,
  targetPlace,
  withSavedModes,
  legTarget,
  stepsAround,

  insertAt,
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

test("a new split is \"Choose one path\", the first mode chip, with two empty paths", () => {
  assert.equal(SPLIT_MODES[0].label, "Choose one path");
  assert.equal(SPLIT_MODES.at(-1).label, "Take all paths simultaneously");
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

test("mode: the builder stores Choose one path; saving reads or (stops follow) or xor (nothing follows)", () => {
  const rows = route();
  assert.equal(savedMode(rows, 1), "or");
  assert.equal(savedMode(rows.slice(0, 2), 1), "xor");
  const and = [camp("c1"), { ...rows[1], split: { ...rows[1].split, mode: "and" } }];
  assert.equal(savedMode(and, 1), "and");
  assert.deepEqual(withSavedModes(rows.slice(0, 2)).map((r) => r.split?.mode), [undefined, "xor"]);
});

test("target: the end of the route, the end of a path, or a place in either list", () => {
  const rows = route();
  const id = rows[1].id;
  assert.deepEqual(targetPlace(rows, ROUTE_END), { index: 3 });
  assert.deepEqual(targetPlace(rows, null), { index: 3 });
  assert.deepEqual(targetPlace(rows, { pos: 1 }), { index: 1 });
  assert.deepEqual(targetPlace(rows, { splitId: id, arm: 1, pos: null }), { splitId: id, arm: 1, index: 1 });
  assert.deepEqual(targetPlace(rows, { splitId: id, arm: 0, pos: 0 }), { splitId: id, arm: 0, index: 0 });
  // A place past the end is the end; a path that is gone is the end of the route.
  assert.deepEqual(targetPlace(rows, { pos: 9 }), { index: 3 });
  assert.deepEqual(targetPlace(rows, { splitId: id, arm: 2, pos: null }), { index: 3 });
  assert.deepEqual(targetPlace(rows, { splitId: -5, arm: 0, pos: null }), { index: 3 });
});

test("target after an add: the end stays the end; a place in the middle moves past the new row", () => {
  assert.equal(targetAfterAdd(ROUTE_END), ROUTE_END);
  assert.deepEqual(targetAfterAdd({ splitId: 4, arm: 1, pos: 0 }), { splitId: 4, arm: 1, pos: 1 });
});

test("target after removing a path: the route when it held that path or the block ends; a later path shifts", () => {
  const two = route();
  const id = two[1].id;
  assert.equal(targetAfterRemovePath(two, { splitId: id, arm: 1, pos: null }, id, 1), ROUTE_END);
  assert.equal(targetAfterRemovePath(two, { splitId: id, arm: 0, pos: null }, id, 1), ROUTE_END);
  const three = [forkRow(["c1"], ["c2"], ["c3"])];
  const t = three[0].id;
  assert.deepEqual(targetAfterRemovePath(three, { splitId: t, arm: 2, pos: null }, t, 0), { splitId: t, arm: 1, pos: null });
  assert.deepEqual(targetAfterRemovePath(three, { splitId: t, arm: 0, pos: null }, t, 2), { splitId: t, arm: 0, pos: null });
  assert.equal(targetAfterRemovePath(three, ROUTE_END, t, 0), ROUTE_END);
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

// An arrow move is `moveRowTo` to `stepTarget`, the same function a drop calls; `shown` is the tab by block id.
const arrow = (rows, id, dir, shown = {}) => {
  const at = stepTarget(rows, id, dir, shown);
  return at ? moveRowTo(rows, id, at) : rows;
};
const andRow = (...arms) => {
  const r = forkRow(...arms);
  return { ...r, split: { ...r.split, mode: "and" } };
};
// The arrows walk what is on screen: the shown path of a 3-path "Choose one path" block, every path of a "Take all" block.
const or3 = () => [camp("c1"), forkRow(["c2", "c3"], ["c4"], ["c5", "c6"]), camp("c7")];
const and2 = () => [camp("c1"), andRow(["c2", "c3"], ["c4", "c5"]), camp("c6")];
const at = (rows, arm, j) => rows[1].split.arms[arm].stops[j];

test("arrows: the row right above a block moves down into the shown path, or path 1 of a Take all block", () => {
  const rows = or3();
  assert.deepEqual(stepTarget(rows, rows[0].id, 1), { splitId: rows[1].id, arm: 0, index: 0 });
  assert.deepEqual(pathIds(arrow(rows, rows[0].id, 1), 0)[0], ["c1", "c2", "c3"]);
  assert.equal(stepName(rows, rows[0].id, 1), "Move into path A");
  const shown = { [rows[1].id]: 2 };
  assert.deepEqual(pathIds(arrow(rows, rows[0].id, 1, shown), 0)[2], ["c1", "c5", "c6"]);
  assert.equal(stepName(rows, rows[0].id, 1, shown), "Move into path C");
  const and = and2();
  assert.deepEqual(pathIds(arrow(and, and[0].id, 1, { [and[1].id]: 1 }), 0)[0], ["c1", "c2", "c3"]);
  assert.equal(stepName(and, and[0].id, 1), "Move into path 1");
});

test("arrows: the row right below a block moves up to the end of the shown path, or the last path of a Take all block", () => {
  const rows = or3();
  assert.deepEqual(stepTarget(rows, rows[2].id, -1, { [rows[1].id]: 1 }), { splitId: rows[1].id, arm: 1, index: 1 });
  assert.equal(stepName(rows, rows[2].id, -1, { [rows[1].id]: 1 }), "Move into path B");
  assert.deepEqual(pathIds(arrow(rows, rows[2].id, -1), 1)[0], ["c2", "c3", "c7"]);
  const and = and2();
  assert.deepEqual(stepTarget(and, and[2].id, -1), { splitId: and[1].id, arm: 1, index: 2 });
  assert.equal(stepName(and, and[2].id, -1), "Move into path 2");
});

test("arrows inside a path: one place up or down in that path", () => {
  for (const make of [or3, and2]) {
    const rows = make();
    const [c2, c3] = rows[1].split.arms[0].stops;
    assert.deepEqual(pathIds(arrow(rows, c3.id, -1), 1)[0], ["c3", "c2"]);
    assert.deepEqual(pathIds(arrow(rows, c2.id, 1), 1)[0], ["c3", "c2"]);
    assert.equal(stepName(rows, c3.id, -1), "Move up");
    assert.equal(stepName(rows, c2.id, 1), "Move down");
  }
  const rows = or3();
  assert.deepEqual(pathIds(arrow(rows, at(rows, 2, 1).id, -1), 1)[2], ["c6", "c5"]);
});

test("arrows in a Choose one block skip the hidden paths: the shown path's ends leave the block", () => {
  const rows = or3();
  const shown = { [rows[1].id]: 1 };
  const c4 = at(rows, 1, 0);
  assert.deepEqual(stepTarget(rows, c4.id, -1, shown), { index: 1 });
  assert.equal(stepName(rows, c4.id, -1, shown), "Move out of the paths");
  assert.deepEqual(ids(arrow(rows, c4.id, 1, shown)), ["c1", "split", "c4", "c7"]);
  assert.equal(stepName(rows, c4.id, 1, shown), "Move out of the paths");
});

test("arrows in a Take all block walk every path in the stacked order", () => {
  const and = and2();
  assert.deepEqual(pathIds(arrow(and, at(and, 1, 0).id, -1), 1), [["c2", "c3", "c4"], ["c5"]]);
  assert.equal(stepName(and, at(and, 1, 0).id, -1), "Move into path 1");
  assert.deepEqual(pathIds(arrow(and, at(and, 0, 1).id, 1), 1), [["c2"], ["c3", "c4", "c5"]]);
  assert.equal(stepName(and, at(and, 0, 1).id, 1), "Move into path 2");
});

test("arrows: up from path A's first row and down from the last path's last row leave the block", () => {
  for (const make of [or3, and2]) {
    const rows = make();
    assert.deepEqual(stepTarget(rows, at(rows, 0, 0).id, -1), { index: 1 });
    assert.deepEqual(ids(arrow(rows, at(rows, 0, 0).id, -1)).slice(0, 3), ["c1", "c2", "split"]);
    assert.equal(stepName(rows, at(rows, 0, 0).id, -1), "Move out of the paths");
    const arm = rows[1].split.arms.length - 1;
    const last = rows[1].split.arms[arm].stops.at(-1);
    const shown = { [rows[1].id]: arm };
    assert.deepEqual(stepTarget(rows, last.id, 1, shown), { index: 2 });
    assert.deepEqual(ids(arrow(rows, last.id, 1, shown)).slice(1, 3), ["split", last.campId]);
    assert.equal(stepName(rows, last.id, 1, shown), "Move out of the paths");
  }
});

test("arrows: a block moves as one block, never into a path, and a stop between two blocks enters one at a time", () => {
  const two = [forkRow(["c1"], ["c2"]), forkRow(["c3"], ["c4"])];
  assert.deepEqual(arrow(two, two[0].id, 1).map((r) => r.id), [two[1].id, two[0].id]);
  assert.deepEqual(stepTarget(two, two[1].id, -1), { index: 0 });
  assert.equal(stepName(two, two[0].id, 1), "Move down");
  // c2 leaves block 1's shown path B downward and lands between the blocks; the next press enters block 2's path A.
  const c2 = two[0].split.arms[1].stops[0];
  const between = arrow(two, c2.id, 1, { [two[0].id]: 1 });
  assert.deepEqual(ids(between), ["split", "c2", "split"]);
  assert.deepEqual(pathIds(between, 0), [["c1"], []]);
  assert.deepEqual(pathIds(arrow(between, c2.id, 1), 1), [["c2", "c3"], ["c4"]]);
  assert.deepEqual(pathIds(arrow(between, c2.id, -1, { [two[0].id]: 1 }), 0), [["c1"], ["c2"]]);
});

test("arrows at the edges: the first row cannot go up, the last cannot go down, a path's stop always moves", () => {
  const rows = route();
  assert.equal(stepTarget(rows, rows[0].id, -1), null);
  assert.equal(stepTarget(rows, rows[2].id, 1), null);
  assert.equal(arrow(rows, rows[0].id, -1), rows);
  assert.equal(stepTarget(rows, -1, 1), null);
  // A block first and last: a shown path's stop leaves upward or downward.
  const only = [forkRow(["c2"], ["c4"])];
  const [c2, c4] = only[0].split.arms.map((a) => a.stops[0]);
  const shown = { [only[0].id]: 1 };
  assert.deepEqual(ids(arrow(only, c2.id, -1)), ["c2", "split"]);
  assert.deepEqual(ids(arrow(only, c4.id, 1, shown)), ["split", "c4"]);
  assert.deepEqual(ids(arrow(only, c4.id, -1, shown)), ["c4", "split"]);
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
  assert.match(SAME_CAMP_LINE, /^Paths are for different places\./);
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
  // An entry keeps the builder's selection before the change, null by default.
  assert.equal(top.entry.sel, null);
  assert.deepEqual(pushUndo([], a, "add split", { id: 7 })[0].sel, { id: 7 });
  for (let i = 0; i < 60; i++) stack = pushUndo(stack, a, `edit ${i}`);
  assert.equal(stack.length, UNDO_CAP);
  assert.equal(stack[0].label, "edit 10");
});

test("add line: its label counts itself in, and `after` names the row before it", () => {
  const two = [camp("c1"), camp("c2")];
  assert.deepEqual(nextStop(two, targetPlace(two, ROUTE_END)), { label: "3", after: "after stop 2" });
  assert.deepEqual(nextStop(two, targetPlace(two, { pos: 1 })), { label: "2", after: "after stop 1" });
  assert.deepEqual(nextStop([], targetPlace([], ROUTE_END)), { label: "1", after: "at the start" });
  // A waypoint before it has no number.
  const way = [camp("c1"), newRow({ place: { kind: "shop", at: { shop: "s1" } } }), camp("c2")];
  assert.deepEqual(nextStop(way, targetPlace(way, { pos: 2 })), { label: "2", after: "after the waypoint" });
  const paths = [camp("c1"), forkRow(["c2"])];
  assert.equal(nextStop(paths, targetPlace(paths, ROUTE_END)).after, "after the paths");
});

test("add line in a path: letters in a choose-one path, the same numbers in a take-all path", () => {
  const rows = [camp("c1"), forkRow(["c2"], ["c3"]), camp("c5")];
  const inB = targetPlace(rows, { splitId: rows[1].id, arm: 1, pos: null });
  assert.deepEqual(nextStop(rows, inB, { [rows[1].id]: 1 }), { label: "3b", after: "after stop 2b" });
  assert.equal(nextStop(rows, targetPlace(rows, { splitId: rows[1].id, arm: 0, pos: null })).label, "3a");
  const and = [camp("c1"), { ...rows[1], split: { ...rows[1].split, mode: "and" } }];
  assert.deepEqual(nextStop(and, targetPlace(and, { splitId: and[1].id, arm: 1, pos: null })), { label: "3", after: "after stop 2" });
  const empty = [camp("c1"), forkRow([], ["c3"])];
  assert.equal(nextStop(empty, targetPlace(empty, { splitId: empty[1].id, arm: 0, pos: null })).after, "at the start of path A");
});

test("a new paths block holds the names given, and its kind", () => {
  const row = newSplitRow("or", [" Safe ", "Risky", "Mirror"]);
  assert.deepEqual(row.split.arms.map((a) => a.label), ["Safe", "Risky", "Mirror"]);
  assert.equal(newSplitRow("and").split.mode, "and");
});

test("a drop at a place inside a path", () => {
  const rows = route();
  assert.deepEqual(dropTarget(rows, { kind: "path", index: 1, arm: 0, at: 2 }, rows[0]), { splitId: rows[1].id, arm: 0, index: 2 });
  assert.deepEqual(dropTarget(rows, { kind: "path", index: 1, arm: 1 }, rows[0]), { splitId: rows[1].id, arm: 1, index: 0 });
});

test("rows made in the same millisecond get different ids", () => {
  const ids = new Set(Array.from({ length: 1000 }, () => newRow().id));
  assert.equal(ids.size, 1000);
});

test("targetExists: the route always; a path while its block still has it", () => {
  const rows = [camp("c1"), forkRow(["c2"], ["c3"])];
  assert.equal(targetExists(rows, { pos: null }), true);
  assert.equal(targetExists(rows, { splitId: rows[1].id, arm: 1, pos: null }), true);
  assert.equal(targetExists(rows, { splitId: rows[1].id, arm: 2, pos: null }), false);
  assert.equal(targetExists(rows, { splitId: -5, arm: 0, pos: null }), false);
});

test("firstErrorAt: the first stop field or path error in the keys' order", () => {
  assert.deepEqual(firstErrorAt(["title", "stops.2.note"]), { key: "2" });
  assert.deepEqual(firstErrorAt(["stops.1.split.arms.1.stops.0.kills"]), { key: "1.b.0" });
  assert.deepEqual(firstErrorAt(["stops.1.split.arms.1.label", "stops.3.note"]), { index: 1, arm: 1 });
  assert.deepEqual(firstErrorAt(["stops.1.split.arms.0.stops"]), { index: 1, arm: 0 });
  assert.equal(firstErrorAt(["stops.1.split", "map"]), null);
});

test("a leg inside one list puts the target right after its first step; legs across lists or from the start do not", () => {
  const rows = [newRow({ campId: "c1" }), newRow({ action: "TP" }), newRow({ campId: "c2" }), forkRow(["c3", "c4"], ["c5"])];
  const [c1, tp, , block] = rows;
  assert.deepEqual(legTarget(rows, "0", "2"), { pos: 1, after: c1.id, before: tp.id });
  const c3 = block.split.arms[0].stops[0];
  const c4 = block.split.arms[0].stops[1];
  assert.deepEqual(legTarget(rows, "3.a.0", "3.a.1"), { splitId: block.id, arm: 0, pos: 1, after: c3.id, before: c4.id });
  assert.equal(legTarget(rows, "2", "3.a.0"), null);
  assert.equal(legTarget(rows, "start", "0"), null);
});

test("steps around a place: the last place step before it and the first after it, pins and actions skipped", () => {
  const pin = newRow({ place: { kind: "build", at: { x: 0.5, y: 0.5 } }, hero: false });
  const rows = [newRow({ campId: "c1" }), pin, newRow({ action: "TP" }), newRow({ campId: "c2" }), forkRow(["c3"], ["c4"])];
  const { from, to } = stepsAround(rows, { index: 2 });
  assert.equal(from.campId, "c1");
  assert.equal(to.campId, "c2");
  assert.deepEqual(stepsAround(rows, { index: 4 }).to, null);
  assert.deepEqual(stepsAround(rows, { index: 5 }), { from: null, to: null });
});

test("a position stays between the same two steps when rows above it are added, removed, moved or dropped", () => {
  const rows = [newRow({ campId: "c1" }), newRow({ campId: "c2" }), newRow({ campId: "c3" }), newRow({ campId: "c4" })];
  const t = legTarget(rows, "2", "3");
  assert.deepEqual(targetPlace(rows, t), { index: 3 });
  // A row added above.
  assert.deepEqual(targetPlace(insertAt(rows, { index: 0 }, newRow({ campId: "c9" })), t), { index: 4 });
  // A row removed above.
  assert.deepEqual(targetPlace(removeRow(rows, rows[0].id), t), { index: 2 });
  // A row moved from above to below.
  assert.deepEqual(ids(moveRowTo(rows, rows[0].id, { index: 4 })), ["c2", "c3", "c4", "c1"]);
  assert.deepEqual(targetPlace(moveRowTo(rows, rows[0].id, { index: 4 }), t), { index: 2 });
  // The step after it removed: right after the step before; both gone: clamped into its list.
  assert.deepEqual(targetPlace(removeRow(rows, rows[3].id), t), { index: 3 });
  assert.deepEqual(targetPlace(removeRow(removeRow(removeRow(rows, rows[3].id), rows[2].id), rows[1].id), t), { index: 1 });
  // An add at the position: the target sits right after the new step.
  const added = newRow({ campId: "c8" });
  const after = targetAfterAdd(t, added.id);
  assert.deepEqual(targetPlace(insertAt(rows, targetPlace(rows, t), added), after), { index: 4 });
});

test("a position in the kept path stays between its steps when the block turns into plain stops", () => {
  const rows = [newRow({ campId: "c1" }), forkRow(["c2", "c3"], ["c4"])];
  const block = rows[1];
  const t = legTarget(rows, "1.a.0", "1.a.1");
  const next = targetAfterRemovePath(rows, t, block.id, 1);
  assert.equal(next.splitId, undefined);
  assert.deepEqual(targetPlace(removePath(rows, block.id, 1), next), { index: 2 });
  assert.equal(targetAfterRemovePath(rows, t, block.id, 0), ROUTE_END);
});

test("targetExists: false when a row the target is anchored to sits in another list", () => {
  const rows = [newRow({ campId: "c1" }), forkRow(["c2", "c3"], ["c4"])];
  const [c2, c3] = rows[1].split.arms[0].stops;
  assert.equal(targetExists(rows, { pos: 2, after: c2.id, before: c3.id }), false);
  assert.equal(targetExists(rows, { splitId: rows[1].id, arm: 0, pos: 1, after: c2.id, before: c3.id }), true);
});

test("a numeric target whose two rows part stays right after its first row", () => {
  const [a, b, c, d] = ["c1", "c2", "c3", "c4"].map((campId) => newRow({ campId }));
  const t = { pos: 1, after: a.id, before: b.id };
  assert.deepEqual(targetPlace([a, c, d, b], t), { index: 1 });
  assert.deepEqual(targetPlace([b, a, c, d], t), { index: 2 });
  assert.deepEqual(targetPlace([b, c, d], t), { index: 0 });
});

test("legTarget: a route leg across a paths block is no leg", () => {
  const rows = [newRow({ campId: "c1" }), forkRow([], []), newRow({ campId: "c2" })];
  assert.equal(legTarget(rows, "0", "2"), null);
});
