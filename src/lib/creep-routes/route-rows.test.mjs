import { test } from "node:test";
import assert from "node:assert/strict";
import { routeRows } from "./route-rows.mjs";

const camp = (id) => ({ campId: id });
const choose = (mode) => (...arms) => ({ campId: null, split: { mode, arms: arms.map((stops, i) => ({ label: `way ${i}`, stops })) } });
const or = choose("or");
const xor = choose("xor");
const and = (...arms) => ({ campId: null, split: { mode: "and", arms: arms.map((stops) => ({ stops })) } });
const shape = (rows) => rows.map((r) => (r.type === "stop" ? `${r.label || "~"}${r.lane ? `:${r.lane}` : ""}${r.off ? "*" : ""}` : r.type));
const lanes = (row) => row.lines.map((l) => `${l.lane}${l.top ? "^" : ""}${l.bottom ? "v" : ""}${l.off ? "*" : ""}`).join(" ");

test("a linear route draws one lane through every row, waypoints too", () => {
  const stops = [camp("c1"), { campId: null, action: "Buy", place: { kind: "shop", at: { shop: "s1" } } }, camp("c2"), camp("c3")];
  const rows = routeRows(stops);
  assert.deepEqual(shape(rows), ["1", "~", "2", "3"]);
  assert.deepEqual(rows.map(lanes), ["av", "a^v", "a^v", "a^"]);
  assert.ok(rows.every((r) => r.lane === ""));
});

test("an or split lists every way, dims the ways not chosen and joins before the shared stops", () => {
  const stops = [camp("c1"), or([camp("c2"), camp("c3")], [camp("c4")]), camp("c5")];
  assert.deepEqual(shape(routeRows(stops)), ["1", "split", "2a:a", "2b:b*", "3a:a", "join", "4"]);
  const viaB = routeRows(stops, { 1: 1 });
  assert.deepEqual(shape(viaB), ["1", "split", "2a:a*", "2b:b", "3a:a*", "join", "4"]);
  assert.equal(lanes(viaB[3]), "a^v* b^v");
});

test("an xor split lists only the chosen way and nothing follows it", () => {
  const stops = [camp("c1"), xor([camp("c2"), camp("c3")], [camp("c4")])];
  assert.deepEqual(shape(routeRows(stops)), ["1", "split", "2a:a", "3a:a"]);
  const viaB = routeRows(stops, { 1: 1 });
  assert.deepEqual(shape(viaB), ["1", "split", "2b:b"]);
  assert.deepEqual(viaB[1].lanes, [{ lane: "b", off: false }]);
  assert.equal(lanes(viaB[2]), "b^");
});

test("a split at index 0 opens the list with its split row", () => {
  assert.deepEqual(shape(routeRows([xor([camp("c1")], [camp("c2")])], { 0: 1 })), ["split", "1b:b"]);
});

test("an and split interleaves every arm with the same numbers and joins before the shared stop", () => {
  const rows = routeRows([camp("c1"), and([camp("c2")], [camp("c3"), camp("c4")]), camp("c5")], { 1: 1 });
  assert.deepEqual(shape(rows), ["1", "split", "2:a", "2:b", "3:b", "join", "4"]);
  assert.deepEqual(rows[1].lanes.map((l) => l.lane), ["a", "b"]);
  assert.equal(lanes(rows[4]), "a^v b^v");
});

test("with nothing after the split each way's line stops at its last node and there is no join", () => {
  const rows = routeRows([camp("c1"), and([camp("c2"), camp("c3")], [camp("c4")])]);
  assert.deepEqual(shape(rows), ["1", "split", "2:a", "2:b", "3:a"]);
  assert.equal(lanes(rows[2]), "a^v b^v");
  assert.equal(lanes(rows[3]), "a^v b^");
  assert.equal(lanes(rows[4]), "a^");
});

test("the rail starts at the first row's node and stops at the last", () => {
  const rows = routeRows([camp("c1"), or([camp("c2")], [camp("c3")]), camp("c4"), camp("c5")]);
  assert.deepEqual(shape(rows), ["1", "split", "2a:a", "2b:b*", "join", "3", "4"]);
  assert.equal(lanes(rows[0]), "av");
  assert.equal(lanes(rows[6]), "a^");
});
