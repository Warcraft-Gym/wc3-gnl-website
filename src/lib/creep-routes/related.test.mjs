import test from "node:test";
import assert from "node:assert/strict";
import { relatedRoutes, allOnSameMap } from "./related.mjs";

const r = (slug, map, race) => ({ slug, map: { slug: map, name: map }, race });
const current = r("current", "autumn-leaves", "orc");

test("routes on the same map come first, however the list is ordered", () => {
  const all = [
    r("orc-elsewhere-1", "echo-isles", "orc"),
    r("orc-elsewhere-2", "turtle-rock", "orc"),
    current,
    r("same-map-1", "autumn-leaves", "human"),
    r("same-map-2", "autumn-leaves", "undead"),
  ];
  assert.deepEqual(
    relatedRoutes(current, all).map((x) => x.slug),
    ["same-map-1", "same-map-2", "orc-elsewhere-1", "orc-elsewhere-2"],
  );
});

test("same-map routes are never crowded out by the filler", () => {
  // The old rule took the first N of a mixed pool, so a map's own
  // alternatives could be pushed off the end by unrelated same-race routes.
  const filler = Array.from({ length: 10 }, (_, i) => r(`filler-${i}`, "echo-isles", "orc"));
  const all = [...filler, current, r("the-alternative", "autumn-leaves", "human")];
  const related = relatedRoutes(current, all, 3);
  assert.equal(related[0].slug, "the-alternative");
  assert.equal(related.length, 3);
});

test("the route itself is never offered", () => {
  const all = [current, r("other", "autumn-leaves", "orc")];
  assert.deepEqual(relatedRoutes(current, all).map((x) => x.slug), ["other"]);
});

test("a route on a map with no alternatives still gets same-race suggestions", () => {
  const all = [current, r("orc-elsewhere", "echo-isles", "orc"), r("human-elsewhere", "echo-isles", "human")];
  assert.deepEqual(relatedRoutes(current, all).map((x) => x.slug), ["orc-elsewhere"]);
});

test("nothing relevant means nothing shown, not filler for its own sake", () => {
  const all = [current, r("unrelated", "echo-isles", "human")];
  assert.deepEqual(relatedRoutes(current, all), []);
});

test("the heading only names the map when every row is on it", () => {
  const sameOnly = [r("a", "autumn-leaves", "orc")];
  const mixed = [r("a", "autumn-leaves", "orc"), r("b", "echo-isles", "orc")];
  assert.equal(allOnSameMap(current, sameOnly), true);
  assert.equal(allOnSameMap(current, mixed), false);
  assert.equal(allOnSameMap(current, []), false, "an empty list must not claim a map");
});
