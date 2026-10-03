import assert from "node:assert/strict";
import test from "node:test";
import { initialStopView, stopViewReducer as reduce } from "./stop-view.mjs";

const open = (s) => [...s.open].sort((a, b) => a - b);

test("start state: first stop selected and open; an empty route has neither", () => {
  const s = initialStopView(4);
  assert.equal(s.selected, 0);
  assert.deepEqual(open(s), [0]);
  assert.deepEqual(initialStopView(0), { selected: null, open: new Set() });
});

test("node click on a closed stop selects and opens it, keeping the others open", () => {
  const s = reduce(initialStopView(4), { type: "node", index: 2 });
  assert.equal(s.selected, 2);
  assert.deepEqual(open(s), [0, 2]);
});

test("node click on an open, unselected stop selects it and closes nothing", () => {
  let s = reduce(initialStopView(4), { type: "node", index: 2 });
  s = reduce(s, { type: "node", index: 0 });
  assert.equal(s.selected, 0);
  assert.deepEqual(open(s), [0, 2]);
});

test("node click on the selected stop deselects it; open is unchanged", () => {
  const s = reduce(initialStopView(4), { type: "node", index: 0 });
  assert.equal(s.selected, null);
  assert.deepEqual(open(s), [0]);
});

test("summary click selects and opens; again on the selected stop does nothing", () => {
  let s = reduce(initialStopView(4), { type: "summary", index: 3 });
  assert.equal(s.selected, 3);
  assert.deepEqual(open(s), [0, 3]);
  const same = reduce(s, { type: "summary", index: 3 });
  assert.equal(same, s);
  // A selected but closed stop reopens from its summary.
  s = reduce(s, { type: "chevron", index: 3 });
  s = reduce(s, { type: "summary", index: 3 });
  assert.deepEqual(open(s), [0, 3]);
});

test("chevron toggles only that stop and never touches the selection", () => {
  let s = reduce(initialStopView(4), { type: "chevron", index: 0 });
  assert.equal(s.selected, 0);
  assert.deepEqual(open(s), []);
  s = reduce(s, { type: "chevron", index: 1 });
  assert.equal(s.selected, 0);
  assert.deepEqual(open(s), [1]);
});

test("expand all and collapse all keep the selection", () => {
  let s = reduce(initialStopView(4), { type: "node", index: 2 });
  s = reduce(s, { type: "expandAll", count: 4 });
  assert.deepEqual(open(s), [0, 1, 2, 3]);
  assert.equal(s.selected, 2);
  s = reduce(s, { type: "collapseAll" });
  assert.deepEqual(open(s), []);
  assert.equal(s.selected, 2);
});

test("deselect clears the selection and keeps open stops", () => {
  const s = reduce(initialStopView(4), { type: "deselect" });
  assert.equal(s.selected, null);
  assert.deepEqual(open(s), [0]);
});

test("keys: string keys select, open and toggle like indexes", () => {
  let s = initialStopView(3, "0");
  assert.equal(s.selected, "0");
  s = reduce(s, { type: "node", key: "1" });
  assert.equal(s.selected, "1");
  assert.deepEqual([...s.open].sort(), ["0", "1"]);
  s = reduce(s, { type: "chevron", key: "0" });
  assert.deepEqual([...s.open], ["1"]);
  s = reduce(s, { type: "node", key: "1" });
  assert.equal(s.selected, null);
});

test("keys: selecting an arm stop also opens its fork; expandAll opens every key given", () => {
  let s = reduce(initialStopView(3, "0"), { type: "node", key: "2.b.0", also: ["2"] });
  assert.equal(s.selected, "2.b.0");
  assert.deepEqual([...s.open].sort(), ["0", "2", "2.b.0"]);
  s = reduce({ ...s, open: new Set(["2.b.0"]) }, { type: "summary", key: "2.b.0", also: ["2"] });
  assert.deepEqual([...s.open].sort(), ["2", "2.b.0"]);
  s = reduce(s, { type: "expandAll", keys: ["0", "1", "2", "2.a.0", "2.b.0"] });
  assert.equal(s.open.size, 5);
});

test("keys: a parallel node's arm stops share numbers but not keys, so each opens on its own", () => {
  let s = reduce(initialStopView(2, "0"), { type: "summary", key: "1.a.0", also: ["1"] });
  s = reduce(s, { type: "chevron", key: "1.b.0" });
  assert.deepEqual([...s.open].sort(), ["0", "1", "1.a.0", "1.b.0"]);
  assert.equal(s.selected, "1.a.0");
});
