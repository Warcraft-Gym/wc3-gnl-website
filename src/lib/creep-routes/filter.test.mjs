import { test } from "node:test";
import assert from "node:assert/strict";
import { featuredFirst, filterCreepRoutes } from "./filter.mjs";

function route(overrides = {}) {
  return {
    slug: "r",
    title: "Route title",
    summary: "A summary",
    author: "Tester",
    race: "human",
    vsRaces: [],
    map: { slug: "autumn-leaves", name: "Autumn Leaves v2" },
    level: "standard",
    ...overrides,
  };
}

const routes = [
  route({ slug: "hu-vs-any", race: "human", vsRaces: [], level: "standard", map: { slug: "autumn-leaves", name: "Autumn Leaves v2" } }),
  route({ slug: "hu-vs-orc", race: "human", vsRaces: ["orc"], level: "standard", map: { slug: "autumn-leaves", name: "Autumn Leaves v2" } }),
  route({ slug: "or-vs-hu", race: "orc", vsRaces: ["human"], level: "beginner", map: { slug: "echo-isles", name: "Echo Isles v2" }, title: "Wolves opener", summary: "Far Seer wolves" }),
  route({ slug: "ud-vs-any", race: "undead", vsRaces: [], level: "standard", map: { slug: "echo-isles", name: "Echo Isles v2" } }),
];

test("no filter returns every route", () => {
  assert.equal(filterCreepRoutes(routes, {}).length, 4);
});

test("race filters to exactly that race", () => {
  const result = filterCreepRoutes(routes, { race: "human" });
  assert.deepEqual(result.map((r) => r.slug).sort(), ["hu-vs-any", "hu-vs-orc"]);
});

test("map filters to that map slug", () => {
  const result = filterCreepRoutes(routes, { map: "echo-isles" });
  assert.deepEqual(result.map((r) => r.slug).sort(), ["or-vs-hu", "ud-vs-any"]);
});

test("level filters to that level", () => {
  const result = filterCreepRoutes(routes, { level: "beginner" });
  assert.deepEqual(result.map((r) => r.slug), ["or-vs-hu"]);
});

test("vsRace \"any\" matches every route regardless of vsRaces", () => {
  const result = filterCreepRoutes(routes, { vsRace: "any" });
  assert.equal(result.length, 4);
});

test("vsRace matches a route written for that opponent, plus every any-opponent route", () => {
  // hu-vs-orc names orc explicitly; hu-vs-any and ud-vs-any's empty
  // vsRaces means "any opponent", so both qualify for every vsRace query
  // too (vsRace filters on opponent only, not on the route's own race) —
  // only or-vs-hu, written specifically for a *different* opponent
  // (human), is excluded.
  const result = filterCreepRoutes(routes, { vsRace: "orc" });
  assert.deepEqual(result.map((r) => r.slug).sort(), ["hu-vs-any", "hu-vs-orc", "ud-vs-any"]);
});

test("vsRace also matches a route written for any opponent (empty vsRaces)", () => {
  const result = filterCreepRoutes(routes, { vsRace: "undead" });
  // hu-vs-any (empty vsRaces, so "any opponent") and ud-vs-any qualify;
  // hu-vs-orc (written specifically for orc) and or-vs-hu (written for
  // human) do not.
  assert.deepEqual(result.map((r) => r.slug).sort(), ["hu-vs-any", "ud-vs-any"]);
});

test("q matches title, summary, author or map name, case-insensitively", () => {
  assert.deepEqual(filterCreepRoutes(routes, { q: "WOLVES" }).map((r) => r.slug), ["or-vs-hu"]);
  assert.deepEqual(filterCreepRoutes(routes, { q: "echo isles" }).map((r) => r.slug).sort(), ["or-vs-hu", "ud-vs-any"]);
  assert.deepEqual(filterCreepRoutes(routes, { q: "nothing matches this" }), []);
});

test("filters combine (race + map + level)", () => {
  const result = filterCreepRoutes(routes, { race: "orc", map: "echo-isles", level: "beginner" });
  assert.deepEqual(result.map((r) => r.slug), ["or-vs-hu"]);
});

test("featuredFirst floats the flagged route to the front", () => {
  const routes = [{ slug: "a" }, { slug: "b", featured: true }, { slug: "c" }];
  assert.deepEqual(featuredFirst(routes).map((r) => r.slug), ["b", "a", "c"], "the rest keep their order");
});

test("featuredFirst leaves a list alone when nothing is flagged", () => {
  const routes = [{ slug: "a" }, { slug: "b" }];
  assert.equal(featuredFirst(routes), routes, "same array back, no needless copy");
});

test("featuredFirst leaves a list alone when the flagged route is already first", () => {
  const routes = [{ slug: "a", featured: true }, { slug: "b" }];
  assert.equal(featuredFirst(routes), routes);
});

test("featuredFirst does nothing when the reader has filtered or sorted", () => {
  const routes = [{ slug: "a" }, { slug: "b", featured: true }];
  assert.deepEqual(featuredFirst(routes, { apply: false }).map((r) => r.slug), ["a", "b"]);
});

test("featuredFirst promotes only the first flag if several are set", () => {
  const routes = [{ slug: "a" }, { slug: "b", featured: true }, { slug: "c", featured: true }];
  assert.deepEqual(featuredFirst(routes).map((r) => r.slug), ["b", "a", "c"]);
});
