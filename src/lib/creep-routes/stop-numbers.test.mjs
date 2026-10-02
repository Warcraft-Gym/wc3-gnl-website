import { test } from "node:test";
import assert from "node:assert/strict";
import { countStops, findStopKey, longestCount, flatStops, numberStops, hiddenBadgeKeys, parseKey, shownStops, stopByKey, stopKeys } from "./stop-numbers.mjs";

const camp = (id) => ({ campId: id });
const fork = (...arms) => ({ campId: null, split: { mode: "or", arms: arms.map((stops, i) => ({ label: `way ${i}`, stops })) } });
const parallel = (...arms) => ({ campId: null, split: { mode: "and", arms: arms.map((stops) => ({ stops })) } });
const labels = (stops, choice) =>
  numberStops(stops, choice).flatMap((n) => [n.label, ...(n.arms ?? []).flatMap((a) => a.stops.map((s) => s.label))]);

test("no fork: 1, 2, 3 with keys 0, 1, 2", () => {
  const n = numberStops([camp("c1"), camp("c2"), camp("c3")]);
  assert.deepEqual(n.map((s) => s.label), ["1", "2", "3"]);
  assert.deepEqual(n.map((s) => s.key), ["0", "1", "2"]);
});

test("a split at 0 takes number 1; its arms read 1a and 1b; the next stop is 2", () => {
  assert.deepEqual(labels([fork([camp("c1")], [camp("c2")]), camp("c3")]), ["1", "1a", "1b", "2"]);
});

test("an or split numbers along the chosen path: the next stop goes on from it with no gap", () => {
  const stops = [camp("c1"), camp("c2"), fork([camp("c3"), camp("c4")], [camp("c5")]), camp("c6")];
  assert.deepEqual(labels(stops), ["1", "2", "3", "3a", "4a", "3b", "5"]);
  assert.deepEqual(labels(stops, { 2: 1 }), ["1", "2", "3", "3a", "4a", "3b", "4"]);
  assert.deepEqual(stopKeys(stops), ["0", "1", "2", "2.a.0", "2.a.1", "2.b.0", "3"]);
});

test("a 3-arm fork letters a, b, c", () => {
  const stops = [camp("c1"), fork([camp("c2")], [camp("c3")], [camp("c4"), camp("c5"), camp("c6")]), camp("c7")];
  assert.deepEqual(labels(stops), ["1", "2", "2a", "2b", "2c", "3c", "4c", "3"]);
  assert.deepEqual(labels(stops, { 1: 2 }), ["1", "2", "2a", "2b", "2c", "3c", "4c", "5"]);
  assert.equal(flatStops(stops).find((s) => s.key === "1.c.2").stop.campId, "c6");
});

test("parseKey reads top-level and arm keys", () => {
  assert.deepEqual(parseKey("3"), { index: 3 });
  assert.deepEqual(parseKey("2.b.1"), { index: 2, arm: 1, j: 1 });
});

test("countStops follows the chosen path of an or split (the first by default) and not the split node", () => {
  assert.equal(countStops([camp("c1"), camp("c2")]), 2);
  assert.equal(countStops([fork([camp("c1")], [camp("c2")])]), 1);
  assert.equal(countStops([camp("c1"), fork([camp("c2"), camp("c3")], [camp("c4")])]), 3);
  assert.equal(countStops([camp("c1"), fork([camp("c2"), camp("c3")], [camp("c4")])], { 1: 1 }), 2);
  assert.equal(countStops([{ _type: "creepSplit", mode: "or", arms: [{ stops: [{}] }, { stops: [{}, {}] }] }]), 1);
  assert.equal(longestCount([camp("c1"), fork([camp("c2")], [camp("c3"), camp("c4")])]), 3);
});

test("findStopKey prefers the top level and the walked arm, then any arm", () => {
  const stops = [camp("c1"), fork([camp("c2")], [camp("c2")]), camp("c3")];
  assert.equal(findStopKey(stops, "c1"), "0");
  assert.equal(findStopKey(stops, "c2"), "1.a.0");
  assert.equal(findStopKey(stops, "c2", { 1: 1 }), "1.b.0");
  assert.equal(findStopKey([fork([camp("c1")], [camp("c2")])], "c2"), "0.b.0");
  assert.equal(findStopKey(stops, "zz"), null);
  assert.equal(stopByKey(stops, "1.b.0").campId, "c2");
  assert.equal(stopByKey(stops, "2").campId, "c3");
});

test("a waypoint takes no number and does not count; an attack does", () => {
  const wp = { campId: null, action: "Plant", place: { kind: "build", at: { x: 0.1, y: 0.1 } } };
  const attack = { campId: null, action: "Harass", place: { kind: "attack", at: { start: "3" } } };
  const stops = [wp, camp("c1"), fork([camp("c2"), wp], [attack]), camp("c3")];
  assert.deepEqual(labels(stops), ["", "1", "2", "2a", "", "2b", "3"]);
  assert.equal(countStops(stops), 3);
  assert.equal(countStops(stops, { 2: 1 }), 3);
});

test("a parallel node runs the same numbers down every arm; the next stop takes N + the longest arm", () => {
  const stops = [camp("c1"), parallel([camp("c2"), camp("c3")], [camp("c4")]), camp("c5")];
  assert.deepEqual(labels(stops), ["1", "2", "2", "3", "2", "4"]);
  assert.deepEqual(stopKeys(stops), ["0", "1", "1.a.0", "1.a.1", "1.b.0", "2"]);
  assert.equal(countStops(stops), 5);
  assert.equal(countStops([{ _type: "creepSplit", mode: "and", arms: [{ stops: [{}] }, { stops: [{}] }] }]), 2);
});

test("findStopKey takes arm 0 of a parallel node first, whatever the choice", () => {
  const stops = [parallel([camp("c2")], [camp("c2")])];
  assert.equal(findStopKey(stops, "c2", { 0: 1 }), "0.a.0");
  assert.equal(stopByKey(stops, "0.b.0").campId, "c2");
});

test("an xor split letters its arms like an or split", () => {
  const xor = { campId: null, split: { mode: "xor", arms: [{ label: "a", stops: [camp("c1"), camp("c2")] }, { label: "b", stops: [camp("c3")] }] } };
  assert.deepEqual(labels([camp("c0"), xor]), ["1", "2", "2a", "3a", "2b"]);
});

test("shownStops: the map leaves out the paths not chosen in or/xor, keeps every and path and the shared stops", () => {
  const c = (id) => ({ campId: id });
  const split = (mode) => ({ campId: null, split: { mode, arms: [{ label: "x", stops: [c("a1")] }, { label: "y", stops: [c("b1"), c("b2")] }] } });
  const ids = (list) => list.map(({ stop }) => stop.campId);
  assert.deepEqual(ids(shownStops([c("s"), split("or"), c("t")])), ["s", null, "a1", "t"]);
  assert.deepEqual(ids(shownStops([c("s"), split("xor")], { 1: 1 })), ["s", null, "b1", "b2"]);
  assert.deepEqual(ids(shownStops([split("and")], { 0: 1 })), [null, "a1", "b1", "b2"]);
});

test("hiddenBadgeKeys: a camp on two paths keeps the active path's badge (the first path in and)", () => {
  const c = (id) => ({ campId: id });
  const both = (mode) => [c("s"), { campId: null, split: { mode, arms: [{ label: "x", stops: [c("c05")] }, { label: "y", stops: [c("c05"), c("c09")] }] } }];
  // or: only the chosen path is drawn, so its own stop keeps the badge.
  assert.deepEqual([...hiddenBadgeKeys(both("or"))], []);
  assert.deepEqual([...hiddenBadgeKeys(both("or"), { 1: 1 })], []);
  const shown = (mode, choice) => shownStops(both(mode), choice).filter(({ key }) => !hiddenBadgeKeys(both(mode), choice).has(key)).map(({ label }) => label);
  assert.deepEqual(shown("or"), ["1", "2", "2a"]);
  assert.deepEqual(shown("or", { 1: 1 }), ["1", "2", "2b", "3b"]);
  // and: every path is drawn, the first path that has the camp keeps the badge.
  assert.deepEqual([...hiddenBadgeKeys(both("and"))], ["1.b.0"]);
});

// v2.7 numbering: waypoints never count; "or"/"xor" number along the chosen path.
const scout = { campId: null, action: "Scout", place: { kind: "scout", at: { start: "1" } } };

test("a waypoint-only path a: the stop after the split is 3, no number skipped", () => {
  const stops = [camp("c1"), camp("c2"), fork([scout], [camp("c3"), camp("c4")]), camp("c5")];
  assert.deepEqual(labels(stops), ["1", "2", "3", "", "3b", "4b", "3"]);
  assert.equal(countStops(stops), 3);
});

test("path b with two camps reads 3b, 4b and the join 5; switching the tab renumbers list and map", () => {
  const stops = [camp("c1"), camp("c2"), fork([scout], [camp("c3"), camp("c4")]), camp("c5")];
  const choice = { 2: 1 };
  assert.deepEqual(labels(stops, choice), ["1", "2", "3", "", "3b", "4b", "5"]);
  // The list (flatStops) and the map (shownStops) read the same numbers for the same choice.
  assert.deepEqual(shownStops(stops, choice).map((s) => s.label), ["1", "2", "3", "3b", "4b", "5"]);
  assert.deepEqual(shownStops(stops).map((s) => s.label), ["1", "2", "3", "", "3"]);
  // The header count follows the chosen path.
  assert.equal(countStops(stops, choice), 5);
  assert.equal(countStops(stops), 3);
});

test("an and split keeps every path on the same numbers and the join after the longest path", () => {
  const stops = [camp("c1"), parallel([camp("c2")], [camp("c3"), camp("c4")]), camp("c5")];
  assert.deepEqual(labels(stops, { 1: 1 }), ["1", "2", "2", "2", "3", "4"]);
  // A path of waypoints only does not count.
  assert.deepEqual(labels([camp("c1"), parallel([scout], [scout]), camp("c5")]), ["1", "2", "", "", "2"]);
});

test("an Echo-shaped split: path a (a shop waypoint) reads 1, 2, scout, shop, 3; path b reads 1, 2, scout, 3b, 4", () => {
  const shop = { campId: null, action: "Buy", place: { kind: "shop", at: { shop: "ngme-0" } } };
  const echo = [camp("c11"), camp("c02"), scout, fork([shop], [camp("c05")]), camp("c03")];
  const read = (choice) => flatStops(echo, choice).filter(({ stop }) => !stop.split).map(({ label, stop }) => label || stop.place?.kind);
  assert.deepEqual(read({}), ["1", "2", "scout", "shop", "3b", "3"]);
  assert.deepEqual(shownStops(echo).filter(({ stop }) => !stop.split).map(({ label, stop }) => label || stop.place?.kind), ["1", "2", "scout", "shop", "3"]);
  assert.deepEqual(shownStops(echo, { 3: 1 }).filter(({ stop }) => !stop.split).map(({ label, stop }) => label || stop.place?.kind), ["1", "2", "scout", "3b", "4"]);
  assert.equal(countStops(echo), 3);
  assert.equal(countStops(echo, { 3: 1 }), 4);
});
