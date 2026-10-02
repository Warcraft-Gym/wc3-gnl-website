import { test } from "node:test";
import assert from "node:assert/strict";
import { toApiMap, toApiMapListItem, toApiRoute, toApiRouteListItem, toApiStop } from "./serialize.mjs";
import { deriveRoute } from "./derive.mjs";
import { toExchangeRoute } from "./edit-link.mjs";

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
    { campId: "c02", kills: [{ row: 0, n: 1 }], leaveRest: true },
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

test("toApiRoute: derived stops only carry heroLevelAfter/xpAfter/left, not the whole camp object", () => {
  const item = toApiRoute(route, map, "https://site.example", iconSrc, deriveRoute);
  for (const s of item.derived.stops) {
    assert.deepEqual(Object.keys(s).sort(), ["heroLevelAfter", "left", "xpAfter"]);
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

test("toApiMap: exposes each camp's drops and each creep's icon (F011)", () => {
  const mapWithDrops = {
    ...map,
    camps: [
      {
        ...map.camps[0],
        creeps: [{ id: "u1", name: "Wolf", level: 3, count: 1, icon: "BTNTimberWolf" }],
        drops: [
          {
            kind: "class",
            class: "Permanent",
            level: 3,
            chance: 100,
            items: [{ id: "afac", name: "Ankh of Reincarnation", icon: "BTNAnkh" }],
          },
        ],
      },
      map.camps[1],
    ],
  };
  const item = toApiMap(mapWithDrops, "https://site.example");
  assert.equal(item.camps[0].creeps[0].icon, "BTNTimberWolf");
  assert.deepEqual(item.camps[0].drops, [
    {
      kind: "class",
      class: "Permanent",
      level: 3,
      chance: 100,
      items: [{ id: "afac", name: "Ankh of Reincarnation", icon: "BTNAnkh" }],
    },
  ]);
});

test("toApiStop carries a stop's kills and leaveRest unchanged", () => {
  const stop = toApiStop(route.stops[1], "https://site.example", iconSrc);
  assert.deepEqual(stop.kills, [{ row: 0, n: 1 }]);
  assert.equal(stop.leaveRest, true);
});

test("toApiStop carries a kill set unchanged", () => {
  const stop = toApiStop({ campId: "c01", kills: [{ row: 0, n: 1, set: 0 }] }, "https://site.example", iconSrc);
  assert.deepEqual(stop.kills, [{ row: 0, n: 1, set: 0 }]);
});

test("round trip of a route with a place stop, a stop without the hero and a fork", () => {
  const full = {
    ...route,
    stops: [
      { campId: null, action: "Plant the Ancient", place: { kind: "point", x: 0.4, y: 0.6 }, units: [{ icon: "ne-ancient-of-war", count: 1 }] },
      { campId: "c01", heroAbsent: true, units: [{ icon: "hu-militia", count: 4 }] },
      {
        campId: null,
        fork: {
          mode: "either",
          arms: [
            { label: "No one at their natural", stops: [{ campId: "c02", units: [{ icon: "hu-archmage", count: 1 }] }] },
            { label: "They are at their natural", stops: [{ campId: null, action: "Harass their base", place: { kind: "start", id: "0" } }] },
          ],
        },
      },
    ],
  };
  const api = toApiRoute(full, map, "https://site.example", iconSrc, deriveRoute);
  assert.deepEqual(api.stops[0].place, { kind: "point", x: 0.4, y: 0.6 });
  assert.equal(api.stops[1].heroAbsent, true);
  assert.equal(api.stops[2].fork.mode, "either");
  assert.equal(api.stops[2].fork.arms[0].stops[0].units[0].iconUrl, "https://site.example/icons/hu-archmage.png");
  assert.deepEqual(api.stops[2].fork.arms[1].stops[0].place, { kind: "start", id: "0" });
  assert.equal(api.derived.stops.length, 3);

  // The "Suggest an update" payload carries all three back to the editor unchanged.
  const back = toExchangeRoute(full).stops;
  assert.deepEqual(back[0].place, full.stops[0].place);
  assert.equal(back[1].heroAbsent, true);
  assert.deepEqual(back[2].fork.arms.map((a) => a.label), ["No one at their natural", "They are at their natural"]);
  assert.deepEqual(back[2].fork.arms[1].stops[0].place, { kind: "start", id: "0" });
  assert.equal(back[2].fork.arms[0].stops[0].campId, "c02");
});
