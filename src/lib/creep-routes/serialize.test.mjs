import { test } from "node:test";
import assert from "node:assert/strict";
import { toApiMap, toApiMapListItem, toApiRoute, toApiRouteListItem, toApiStop } from "./serialize.mjs";
import { deriveRoute } from "./derive.mjs";

const iconSrc = (icon) => `/icons/${icon}.png`;

const map = {
  slug: "autumn-leaves",
  name: "Autumn Leaves v2",
  mapVersion: "2.0",
  w3cMapId: 44,
  bounds: { xMin: -1, xMax: 1, yMin: -1, yMax: 1 },
  image: { width: 256, height: 256 },
  camps: [
    { id: "c01", x: 0.1, y: 0.1, worldX: 0, worldY: 0, level: 3, xp: 60, band: "easy", sleeps: false, creeps: [{ id: "u1", name: "Wolf", level: 3, count: 1 }] },
    { id: "c02", x: 0.2, y: 0.2, worldX: 0, worldY: 0, level: 2, xp: 40, band: "easy", sleeps: false, creeps: [{ id: "u2", name: "Rat", level: 2, count: 1 }] },
  ],
  starts: [{ player: 0, x: 0, y: 0, worldX: 0, worldY: 0 }],
  mines: [],
  shops: [],
  minimapUrl: "/maps/autumn-leaves.png",
};

const route = {
  slug: "human-archmage-autumn-leaves",
  title: "Archmage route",
  race: "human",
  vsRaces: [],
  level: "standard",
  map: { slug: "autumn-leaves", name: "Autumn Leaves v2" },
  mapVersion: "2.0",
  hero: "hu-archmage",
  summary: "A summary",
  author: "Tester",
  tags: ["fast-expand", "archmage"],
  featured: true,
  publishedAt: "2026-08-22T10:00:00Z",
  updatedAt: "2026-09-12T10:00:00Z",
  build: { slug: "human-fast-expand", title: "Fast expand" },
  description: ["Some notes."],
  stops: [
    { campId: "c01", units: [{ icon: "hu-archmage", count: 1 }], note: "First camp" },
    { campId: "c02" },
  ],
};

test("toApiStop makes an absolute iconUrl for each unit, omits units when none", () => {
  const withUnits = toApiStop(route.stops[0], "https://site.example", iconSrc);
  assert.deepEqual(withUnits.units, [{ icon: "hu-archmage", count: 1, iconUrl: "https://site.example/icons/hu-archmage.png" }]);
  const withoutUnits = toApiStop(route.stops[1], "https://site.example", iconSrc);
  assert.equal("units" in withoutUnits, false);
});

test("toApiRouteListItem: narrow field set, includes tags, no description/build", () => {
  const item = toApiRouteListItem(route, "https://site.example", iconSrc);
  assert.equal(item.slug, route.slug);
  assert.deepEqual(item.tags, ["fast-expand", "archmage"]);
  assert.equal("description" in item, false);
  assert.equal("build" in item, false);
  assert.equal(item.map.mapVersion, "2.0");
  assert.equal(item.stops.length, 2);
});

test("toApiRouteListItem: tags default to [] when the route has none", () => {
  const { tags, ...rest } = route;
  void tags;
  const item = toApiRouteListItem(rest, "https://site.example", iconSrc);
  assert.deepEqual(item.tags, []);
});

test("toApiRoute: adds description, build and derived (real deriveRoute)", () => {
  const item = toApiRoute(route, map, "https://site.example", iconSrc, deriveRoute);
  assert.deepEqual(item.description, ["Some notes."]);
  assert.deepEqual(item.build, { slug: "human-fast-expand", title: "Fast expand" });
  assert.equal(item.derived.stops.length, 2);
  assert.equal(typeof item.derived.finalLevel, "number");
  assert.equal(typeof item.derived.finalXp, "number");
  // Still carries every list-item field too (tags included).
  assert.deepEqual(item.tags, ["fast-expand", "archmage"]);
});

test("toApiRoute: derived stops only carry heroLevelAfter/xpAfter, not the whole camp object", () => {
  const item = toApiRoute(route, map, "https://site.example", iconSrc, deriveRoute);
  for (const s of item.derived.stops) {
    assert.deepEqual(Object.keys(s).sort(), ["heroLevelAfter", "xpAfter"]);
  }
});

test("toApiMapListItem: camps is a count, minimapUrl made absolute", () => {
  const item = toApiMapListItem(map, "https://site.example");
  assert.equal(item.camps, 2);
  assert.equal(item.minimapUrl, "https://site.example/maps/autumn-leaves.png");
});

test("toApiMapListItem: an already-absolute minimapUrl is left alone", () => {
  const item = toApiMapListItem({ ...map, minimapUrl: "https://cdn.sanity.io/x.png" }, "https://site.example");
  assert.equal(item.minimapUrl, "https://cdn.sanity.io/x.png");
});

test("toApiMap: the full catalogue, minimapUrl made absolute", () => {
  const item = toApiMap(map, "https://site.example");
  assert.equal(item.camps.length, 2);
  assert.equal(item.minimapUrl, "https://site.example/maps/autumn-leaves.png");
});
