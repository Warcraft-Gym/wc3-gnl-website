import { test } from "node:test";
import assert from "node:assert/strict";
import { countStops, findStopKey, flatStops, numberStops, parseKey, stopByKey, stopKeys } from "./stop-numbers.mjs";

const camp = (id) => ({ campId: id });
const fork = (...arms) => ({ campId: null, split: { mode: "or", arms: arms.map((stops, i) => ({ label: `way ${i}`, stops })) } });
const parallel = (...arms) => ({ campId: null, split: { mode: "and", arms: arms.map((stops) => ({ stops })) } });
const labels = (stops) =>
  numberStops(stops).flatMap((n) => [n.label, ...(n.arms ?? []).flatMap((a) => a.stops.map((s) => s.label))]);

test("no fork: 1, 2, 3 with keys 0, 1, 2", () => {
  const n = numberStops([camp("c1"), camp("c2"), camp("c3")]);
  assert.deepEqual(n.map((s) => s.label), ["1", "2", "3"]);
  assert.deepEqual(n.map((s) => s.key), ["0", "1", "2"]);
});

test("a split at 0 takes number 1; its arms read 1a and 1b; the next stop is 2", () => {
  assert.deepEqual(labels([fork([camp("c1")], [camp("c2")]), camp("c3")]), ["1", "1a", "1b", "2"]);
});

test("a fork mid-route with arms of unequal length: the next stop is N + the longest arm", () => {
  const stops = [camp("c1"), camp("c2"), fork([camp("c3"), camp("c4")], [camp("c5")]), camp("c6")];
  assert.deepEqual(labels(stops), ["1", "2", "3", "3a", "4a", "3b", "5"]);
  assert.deepEqual(stopKeys(stops), ["0", "1", "2", "2.a.0", "2.a.1", "2.b.0", "3"]);
});

test("a 3-arm fork letters a, b, c", () => {
  const stops = [camp("c1"), fork([camp("c2")], [camp("c3")], [camp("c4"), camp("c5"), camp("c6")]), camp("c7")];
  assert.deepEqual(labels(stops), ["1", "2", "2a", "2b", "2c", "3c", "4c", "5"]);
  assert.equal(flatStops(stops).find((s) => s.key === "1.c.2").stop.campId, "c6");
});

test("parseKey reads top-level and arm keys", () => {
  assert.deepEqual(parseKey("3"), { index: 3 });
  assert.deepEqual(parseKey("2.b.1"), { index: 2, arm: 1, j: 1 });
});

test("countStops counts every arm's stops and not the fork node; a whole-route pair counts 2", () => {
  assert.equal(countStops([camp("c1"), camp("c2")]), 2);
  assert.equal(countStops([fork([camp("c1")], [camp("c2")])]), 2);
  assert.equal(countStops([camp("c1"), fork([camp("c2"), camp("c3")], [camp("c4")])]), 4);
  assert.equal(countStops([{ _type: "creepSplit", arms: [{ stops: [{}] }, { stops: [{}, {}] }] }]), 3);
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
  assert.equal(countStops(stops), 4);
});

test("a parallel node runs the same numbers down every arm; the next stop takes N + the longest arm", () => {
  const stops = [camp("c1"), parallel([camp("c2"), camp("c3")], [camp("c4")]), camp("c5")];
  assert.deepEqual(labels(stops), ["1", "2", "2", "3", "2", "4"]);
  assert.deepEqual(stopKeys(stops), ["0", "1", "1.a.0", "1.a.1", "1.b.0", "2"]);
  assert.equal(countStops(stops), 5);
  assert.equal(countStops([{ _type: "creepSplit", arms: [{ stops: [{}] }, { stops: [{}] }] }]), 2);
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
