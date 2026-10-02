import { test } from "node:test";
import assert from "node:assert/strict";
import { flatStops, numberStops, parseKey, stopKeys } from "./stop-numbers.mjs";

const camp = (id) => ({ campId: id });
const fork = (...arms) => ({ campId: null, fork: { mode: "either", arms: arms.map((stops, i) => ({ label: `way ${i}`, stops })) } });
const labels = (stops) =>
  numberStops(stops).flatMap((n) => [n.label, ...(n.arms ?? []).flatMap((a) => a.stops.map((s) => s.label))]);

test("no fork: 1, 2, 3 with keys 0, 1, 2", () => {
  const n = numberStops([camp("c1"), camp("c2"), camp("c3")]);
  assert.deepEqual(n.map((s) => s.label), ["1", "2", "3"]);
  assert.deepEqual(n.map((s) => s.key), ["0", "1", "2"]);
});

test("a fork at 0 takes number 1; its arms read 1a and 1b; the next stop is 2", () => {
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
