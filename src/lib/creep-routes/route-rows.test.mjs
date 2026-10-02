import { test } from "node:test";
import assert from "node:assert/strict";
import { routeRows } from "./route-rows.mjs";

const camp = (id) => ({ campId: id });
const choose = (mode) => (...arms) => ({ campId: null, split: { mode, arms: arms.map((stops, i) => ({ label: `path ${i}`, stops })) } });
const or = choose("or");
const xor = choose("xor");
const and = (...arms) => ({ campId: null, split: { mode: "and", arms: arms.map((stops) => ({ stops })) } });
const shape = (rows) => rows.map((r) => (r.type === "stop" ? `${r.label || "~"}${r.lane ? `:${r.lane}` : ""}` : r.type));
const lanes = (row) => row.lines.map((l) => `${l.lane}${l.top ? "^" : ""}${l.bottom ? "v" : ""}${l.off ? "*" : ""}`).join(" ");

test("a linear route draws one lane through every row, waypoints too", () => {
  const stops = [camp("c1"), { campId: null, action: "Buy", place: { kind: "shop", at: { shop: "s1" } } }, camp("c2"), camp("c3")];
  const rows = routeRows(stops);
  assert.deepEqual(shape(rows), ["1", "~", "2", "3"]);
  assert.deepEqual(rows.map(lanes), ["av", "a^v", "a^v", "a^"]);
  assert.ok(rows.every((r) => r.lane === ""));
});

test("an or split lists only the chosen path; the path not taken is a dashed lane to the join", () => {
  const stops = [camp("c1"), or([camp("c2"), camp("c3")], [camp("c4")]), camp("c5")];
  const viaA = routeRows(stops);
  assert.deepEqual(shape(viaA), ["1", "split", "2a:a", "3a:a", "join", "4"]);
  assert.deepEqual(viaA[1].lanes, [{ lane: "a", off: false }, { lane: "b", off: true }]);
  assert.deepEqual(viaA[4].lanes, viaA[1].lanes);
  assert.equal(lanes(viaA[2]), "a^v b^v*");
  const viaB = routeRows(stops, { 1: 1 });
  assert.deepEqual(shape(viaB), ["1", "split", "2b:b", "join", "4"]);
  assert.equal(lanes(viaB[2]), "a^v* b^v");
  assert.ok(viaB.filter((r) => r.type === "stop" && r.lane).every((r) => r.panel === "1"));
});

test("each path's stops are one block: path a's, then path b's, then path c's, then the join", () => {
  const rows = routeRows([and([camp("c1"), camp("c2")], [camp("c3")], [camp("c4"), camp("c5")]), camp("c6")]);
  assert.deepEqual(shape(rows), ["split", "1:a", "2:a", "1:b", "1:c", "2:c", "join", "3"]);
  // Lanes b and c run down past path a's block; lane a runs on past the later blocks to the join.
  assert.equal(lanes(rows[1]), "a^v b^v c^v");
  assert.equal(lanes(rows[3]), "a^v b^v c^v");
  assert.equal(lanes(rows[5]), "a^v b^v c^v");
  assert.ok(rows.every((r) => r.panel === undefined));
});

test("an xor split lists only the chosen path; the path not taken is a dashed stub in the split row", () => {
  const stops = [camp("c1"), xor([camp("c2"), camp("c3")], [camp("c4")])];
  assert.deepEqual(shape(routeRows(stops)), ["1", "split", "2a:a", "3a:a"]);
  const viaB = routeRows(stops, { 1: 1 });
  assert.deepEqual(shape(viaB), ["1", "split", "2b:b"]);
  assert.deepEqual(viaB[1].lanes, [{ lane: "a", off: true }, { lane: "b", off: false }]);
  assert.equal(lanes(viaB[2]), "b^");
});

test("a split at index 0 opens the list with its split row", () => {
  assert.deepEqual(shape(routeRows([xor([camp("c1")], [camp("c2")])], { 0: 1 })), ["split", "1b:b"]);
});

test("an and split lists every arm with the same numbers and joins before the shared stop", () => {
  const rows = routeRows([camp("c1"), and([camp("c2")], [camp("c3"), camp("c4")]), camp("c5")], { 1: 1 });
  assert.deepEqual(shape(rows), ["1", "split", "2:a", "2:b", "3:b", "join", "4"]);
  assert.deepEqual(rows[1].lanes.map((l) => l.lane), ["a", "b"]);
  assert.equal(lanes(rows[4]), "a^v b^v");
});

test("with nothing after the split each path's line stops at its last node and there is no join", () => {
  const rows = routeRows([camp("c1"), and([camp("c2"), camp("c3")], [camp("c4")])]);
  assert.deepEqual(shape(rows), ["1", "split", "2:a", "3:a", "2:b"]);
  assert.equal(lanes(rows[2]), "a^v b^v");
  assert.equal(lanes(rows[3]), "a^ b^v");
  assert.equal(lanes(rows[4]), "b^");
});

test("the rail starts at the first row's node and stops at the last", () => {
  const rows = routeRows([camp("c1"), or([camp("c2")], [camp("c3")]), camp("c4"), camp("c5")]);
  assert.deepEqual(shape(rows), ["1", "split", "2a:a", "join", "3", "4"]);
  assert.equal(lanes(rows[0]), "av");
  assert.equal(lanes(rows[5]), "a^");
});
