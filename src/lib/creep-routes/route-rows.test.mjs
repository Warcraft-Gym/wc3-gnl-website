import { test } from "node:test";
import assert from "node:assert/strict";
import { hasLanes, routeRows } from "./route-rows.mjs";

const camp = (id) => ({ campId: id });
const fork = (...arms) => ({ campId: null, fork: { arms: arms.map((a, i) => ({ label: `way ${i}`, stops: a.stops ?? a, ...(a.ends ? { ends: true } : {}) })) } });
const parallel = (...arms) => ({ campId: null, parallel: { arms: arms.map((stops) => ({ stops })) } });
const shape = (rows) => rows.map((r) => (r.type === "stop" ? `${r.label || "~"}${r.lane ? `:${r.lane}` : ""}${r.off ? "*" : ""}` : `${r.type}${r.off ? "*" : ""}`));
const lanes = (row) => row.lines.map((l) => `${l.lane}${l.top ? "^" : ""}${l.bottom ? "v" : ""}${l.off ? "*" : ""}`).join(" ");

test("a linear route has no lanes: one main row per stop", () => {
  const stops = [camp("c1"), camp("c2"), camp("c3")];
  assert.equal(hasLanes(stops), false);
  assert.deepEqual(shape(routeRows(stops)), ["1", "2", "3"]);
});

test("a fork mid-route with unequal arms interleaves a[0], b[0], a[1], then joins", () => {
  const stops = [camp("c1"), fork([camp("c2"), camp("c3")], [camp("c4")]), camp("c5")];
  assert.equal(hasLanes(stops), true);
  assert.deepEqual(shape(routeRows(stops)), ["1", "split", "2a:a", "2b:b*", "3a:a", "join", "4"]);
  assert.deepEqual(shape(routeRows(stops, { 1: 1 })), ["1", "split", "2a:a*", "2b:b", "3a:a*", "join", "4"]);
});

test("a fork at index 0 opens the list with its split row", () => {
  assert.deepEqual(shape(routeRows([fork([camp("c1")], [camp("c2")])])), ["split", "1a:a", "1b:b*", "join"]);
});

test("a parallel node runs the same numbers, dims nothing and joins", () => {
  const rows = routeRows([camp("c1"), parallel([camp("c2")], [camp("c3")]), camp("c4")], { 1: 1 });
  assert.deepEqual(shape(rows), ["1", "split", "2:a", "2:b", "join", "3"]);
});

test("an ending arm stops its line at its last node and needs no join; choosing it turns off what follows", () => {
  const stops = [camp("c1"), fork([camp("c2"), camp("c3")], { stops: [camp("c4")], ends: true }), camp("c5")];
  const rows = routeRows(stops);
  assert.deepEqual(shape(rows), ["1", "split", "2a:a", "2b:b*", "3a:a", "4"]);
  assert.equal(lanes(rows[2]), "a^v b^v*");
  assert.equal(lanes(rows[3]), "a^v b^*");
  assert.equal(lanes(rows[4]), "a^v");
  assert.deepEqual(shape(routeRows(stops, { 1: 1 })), ["1", "split", "2a:a*", "2b:b", "3a:a*", "4*"]);
});

test("a node followed by shared stops: the rail starts at the first node and stops at the last", () => {
  const rows = routeRows([camp("c1"), parallel([camp("c2")], [camp("c3"), camp("c4")]), camp("c5"), camp("c6")]);
  assert.deepEqual(shape(rows), ["1", "split", "2:a", "2:b", "3:b", "join", "4", "5"]);
  assert.equal(lanes(rows[0]), "av");
  assert.equal(lanes(rows[4]), "a^v b^v");
  assert.equal(lanes(rows[7]), "a^");
});
