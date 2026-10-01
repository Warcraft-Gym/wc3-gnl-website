import test from "node:test";
import assert from "node:assert/strict";
import { relatedRoutes, allOnSameMap, guideRoutes } from "./related.mjs";

const r = (slug, map, race) => ({ slug, map: { slug: map, name: map }, race });
const current = r("current", "autumn-leaves", "orc");

test("same-race routes on the same map come first, however the list is ordered", () => {
  const all = [
    r("orc-elsewhere-1", "echo-isles", "orc"),
    r("orc-elsewhere-2", "turtle-rock", "orc"),
    current,
    r("same-map-1", "autumn-leaves", "orc"),
    r("same-map-2", "autumn-leaves", "orc"),
  ];
  assert.deepEqual(
    relatedRoutes(current, all).map((x) => x.slug),
    ["same-map-1", "same-map-2", "orc-elsewhere-1", "orc-elsewhere-2"],
  );
});

test("other races are never offered, even on the same map", () => {
  const all = [current, r("human-same-map", "autumn-leaves", "human"), r("orc-elsewhere", "echo-isles", "orc")];
  assert.deepEqual(relatedRoutes(current, all).map((x) => x.slug), ["orc-elsewhere"]);
});

test("same-map routes are never crowded out by the filler", () => {
  // The old rule took the first N of a mixed pool, so a map's own
  // alternatives could be pushed off the end by unrelated same-race routes.
  const filler = Array.from({ length: 10 }, (_, i) => r(`filler-${i}`, "echo-isles", "orc"));
  const all = [...filler, current, r("the-alternative", "autumn-leaves", "orc")];
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

test("a guide offers two routes on its map, then the list's top pick", () => {
  const f = (slug, map, featured = false) => ({ ...r(slug, map, "orc"), featured });
  const all = [f("new-elsewhere", "echo-isles"), f("example", "springtime"), f("spring-1", "springtime"), f("starred", "turtle-rock", true), f("spring-2", "springtime"), f("spring-3", "springtime")];
  const slugs = guideRoutes(all, { mapSlug: "springtime", exclude: "example" }).map((x) => x.slug);
  assert.deepEqual(slugs, ["spring-1", "spring-2", "starred"]);
});

test("a guide's map with one route still fills the list from other maps", () => {
  const all = [r("a", "echo-isles", "orc"), r("b", "springtime", "ud"), r("c", "turtle-rock", "hu")];
  assert.deepEqual(guideRoutes(all, { mapSlug: "springtime" }).map((x) => x.slug), ["b", "a", "c"]);
});
