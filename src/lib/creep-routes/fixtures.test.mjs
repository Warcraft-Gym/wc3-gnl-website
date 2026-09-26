import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { FIXTURE_MAPS, FIXTURE_ROUTES } from "./fixtures.mjs";

test("FIXTURE_MAPS has one entry per generated catalogue, each with a minimapUrl", () => {
  assert.ok(FIXTURE_MAPS.length >= 8);
  for (const map of FIXTURE_MAPS) {
    assert.equal(map.minimapUrl, `/maps/${map.slug}.png`);
    assert.ok(Array.isArray(map.camps) && map.camps.length > 0, `${map.slug} has camps`);
  }
});

test("FIXTURE_MAPS has exactly one entry per src/lib/creep-routes/maps/*.json file on disk", () => {
  // Guards against a repeat of the northern-isles bug (F006): the
  // catalogue file existed on disk but fixtures.mjs never imported it, so
  // it was silently missing from the map selects and the API. Reading the
  // directory here means a future catalogue that isn't wired in fails this
  // test instead of just quietly not showing up anywhere.
  const mapsDir = join(dirname(fileURLToPath(import.meta.url)), "maps");
  const filesOnDisk = readdirSync(mapsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
  const fixtureSlugs = FIXTURE_MAPS.map((m) => m.slug).sort();
  assert.deepEqual(
    fixtureSlugs,
    filesOnDisk,
    `FIXTURE_MAPS slugs (${JSON.stringify(fixtureSlugs)}) must match maps/*.json files on disk (${JSON.stringify(filesOnDisk)})`,
  );
});

test("FIXTURE_ROUTES has at least five routes", () => {
  assert.ok(FIXTURE_ROUTES.length >= 5, `expected >= 5 routes, got ${FIXTURE_ROUTES.length}`);
});

test("every fixture route has at least two stops", () => {
  for (const route of FIXTURE_ROUTES) {
    assert.ok(route.stops.length >= 2, `${route.slug} has fewer than 2 stops`);
  }
});

test("every camp stop's campId exists on its route's map", () => {
  const mapBySlug = new Map(FIXTURE_MAPS.map((m) => [m.slug, m]));
  for (const route of FIXTURE_ROUTES) {
    const map = mapBySlug.get(route.map.slug);
    assert.ok(map, `${route.slug} references a known map (${route.map.slug})`);
    for (const stop of route.stops) {
      if (stop.campId === null) continue;
      assert.ok(
        map.camps.some((c) => c.id === stop.campId),
        `${route.slug} stop campId ${stop.campId} exists on ${map.slug}`,
      );
    }
  }
});

test("at least one fixture route per race", () => {
  const races = new Set(FIXTURE_ROUTES.map((r) => r.race));
  for (const race of ["human", "orc", "nightelf", "undead"]) {
    assert.ok(races.has(race), `missing a fixture route for ${race}`);
  }
});

test("no fixture stop carries a time field", () => {
  for (const route of FIXTURE_ROUTES) {
    for (const stop of route.stops) {
      assert.ok(!("time" in stop), `${route.slug} has a stop with a time field`);
    }
  }
});

test("at least two different maps are used, Autumn Leaves at least three times", () => {
  const maps = new Set(FIXTURE_ROUTES.map((r) => r.map.slug));
  assert.ok(maps.size >= 2);
  const autumnLeavesCount = FIXTURE_ROUTES.filter((r) => r.map.slug === "autumn-leaves").length;
  assert.ok(autumnLeavesCount >= 3, `expected >= 3 Autumn Leaves routes, got ${autumnLeavesCount}`);
});

test("at least one beginner route, one with vsRaces set, one with a condition, one with a non-camp stop", () => {
  assert.ok(FIXTURE_ROUTES.some((r) => r.level === "beginner"));
  assert.ok(FIXTURE_ROUTES.some((r) => r.vsRaces.length > 0));
  assert.ok(FIXTURE_ROUTES.some((r) => r.stops.some((s) => s.condition)));
  assert.ok(FIXTURE_ROUTES.some((r) => r.stops.some((s) => s.campId === null && s.action)));
});

test("every fixture route declares the catalogue mapVersion it was written against", () => {
  // A map revision can add, remove and renumber camps, so a `campId` that
  // still *exists* after a rotation may point at a completely different
  // camp. Echo Isles v2.2 did exactly that: it added three camps and shifted
  // every id, quietly turning this suite's beginner route's last stop from
  // an easy level-8 murloc camp into a medium level-13 one. The route page
  // renders a "written for vX, catalogue is vY" warning — but only when the
  // route carries a `mapVersion` at all, which that route did not. Requiring
  // one here is what makes the warning trustworthy.
  for (const route of FIXTURE_ROUTES) {
    const map = FIXTURE_MAPS.find((m) => m.slug === route.map.slug);
    assert.ok(map, `${route.slug} references unknown map ${route.map.slug}`);
    if (map.mapVersion === undefined) continue; // map itself is unversioned
    assert.ok(route.mapVersion, `${route.slug} has no mapVersion (map is v${map.mapVersion})`);
    assert.equal(
      route.mapVersion,
      map.mapVersion,
      `${route.slug} is written for v${route.mapVersion} but ${map.slug} is v${map.mapVersion} — ` +
        "re-point its campIds against the new catalogue, then bump its mapVersion",
    );
  }
});
