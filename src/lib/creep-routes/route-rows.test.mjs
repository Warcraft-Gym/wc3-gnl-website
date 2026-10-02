import { test } from "node:test";
import assert from "node:assert/strict";
import { joinXpLabel, routeRows } from "./route-rows.mjs";
import { deriveRoute } from "./derive.mjs";
import { hiddenBadgeKeys, shownStops } from "./stop-numbers.mjs";

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
  // Path b is one stop long, so the shared stop after it is 3: numbers follow the chosen path.
  assert.deepEqual(shape(viaB), ["1", "split", "2b:b", "join", "3"]);
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

test("an and block is one XP event: its rows carry block, and it ends in a join row even with nothing after", () => {
  const rows = routeRows([camp("c1"), and([camp("c2"), camp("c3")], [camp("c4")])]);
  assert.deepEqual(shape(rows), ["1", "split", "2:a", "3:a", "2:b", "join"]);
  assert.deepEqual(rows.filter((r) => r.block).map((r) => r.label), ["2", "3", "2"]);
  assert.ok(rows.every((r) => !r.panel));
  assert.equal(rows[5].mode, "and");
  assert.equal(lanes(rows[2]), "a^v b^v");
  assert.equal(lanes(rows[4]), "a^v b^v");
});

test("the rail starts at the first row's node and stops at the last", () => {
  const rows = routeRows([camp("c1"), or([camp("c2")], [camp("c3")]), camp("c4"), camp("c5")]);
  assert.deepEqual(shape(rows), ["1", "split", "2a:a", "join", "3", "4"]);
  assert.equal(lanes(rows[0]), "av");
  assert.equal(lanes(rows[5]), "a^");
});

test("an and block's join row reads the level after the block and its XP total", () => {
  assert.equal(joinXpLabel({ levelBefore: 2, levelAfter: 3, xpBefore: 260, xpGained: 250 }), "Lv 3 · +250 xp");
  assert.equal(joinXpLabel({ levelBefore: 1, levelAfter: 1, xpBefore: 0, xpGained: 0 }), "Lv 1 · +0 xp");
});

// The staging Echo Isles route: 1 c11, 2 c02, a scout waypoint, an "or" split on c05, then c03.
const echo = () => [camp("c11"), camp("c02"), { campId: null, action: "Scout", place: { kind: "scout", at: { start: "1" } } }, or([camp("c05")], [camp("c05")]), camp("c03")];

test("the first stop after an or split keeps its number in the list and on the map, on either path", () => {
  for (const pick of [0, 1]) {
    const choice = { 3: pick };
    const row = routeRows(echo(), choice).find((r) => r.type === "stop" && r.stop.campId === "c03");
    assert.equal(row.label, "4");
    // The map draws every shown stop's label as its disc, and hides none of the shared stops.
    const shown = shownStops(echo(), choice).find((s) => s.stop.campId === "c03");
    assert.equal(shown.label, "4");
    assert.ok(!hiddenBadgeKeys(echo(), choice).has(shown.key));
  }
});

test("an and block's join row still shows the grouped total", () => {
  const map = { camps: ["c1", "c2", "c3"].map((id) => ({ id, level: 4, xp: 80, band: "easy", creeps: [{ id: "x", name: "X", level: 2, count: 2 }] })) };
  const stops = [camp("c1"), and([camp("c2")], [camp("c3")]), camp("c1")];
  const rows = routeRows(stops);
  const join = rows.find((r) => r.type === "join");
  assert.equal(join.mode, "and");
  const node = deriveRoute({ stops }, map).stops[join.index].split;
  assert.match(joinXpLabel(node), /^Lv \d+ · \+\d+ xp$/);
  assert.ok(node.xpGained > 0);
});
