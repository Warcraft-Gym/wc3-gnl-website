/**
 * Fixture data for creep maps and routes, plain JavaScript so `node --test`
 * can check it with no loader (see `fixtures.test.mjs`). `fixtures.ts`
 * re-exports this as typed `CreepMap[]`/`CreepRoute[]`.
 *
 * Maps: one `CreepMap` per generated catalogue under `maps/*.json` (eight of
 * the nine bundle maps today — `northern-isles` has no catalogue yet, see
 * `docs/creep-routes.md`), with `minimapUrl` pointing at the matching
 * `public/maps/<slug>.png`.
 *
 * Routes: seed routes for local dev and as the fallback when Sanity has
 * none. Times are real seconds; camp ids are real camp ids taken from the
 * matching map's catalogue (never invented). Authors "Gym coaches".
 */
// Static JSON module imports (Node 22 + Turbopack both understand `with {
// type: "json" }` natively) rather than a runtime `readFileSync` of a
// directory built from `import.meta.url`/`import.meta.dirname`: the former
// pattern trips up Turbopack's production build two different ways —
// `new URL("./maps/", import.meta.url)` gets special-cased as an asset
// reference and fails to resolve a directory, and `import.meta.dirname`
// comes back `undefined` inside Turbopack's server-component module wrapper
// even though it's set under plain `node --test`. Static imports sidestep
// both: every JSON file is a real, statically analysable module specifier.
import autumnLeaves from "./maps/autumn-leaves.json" with { type: "json" };
import echoIsles from "./maps/echo-isles.json" with { type: "json" };
import lastRefuge from "./maps/last-refuge.json" with { type: "json" };
import shallowGrave from "./maps/shallow-grave.json" with { type: "json" };
import springtime from "./maps/springtime.json" with { type: "json" };
import tidehunters from "./maps/tidehunters.json" with { type: "json" };
import turtleRock from "./maps/turtle-rock.json" with { type: "json" };
import twistedMeadows from "./maps/twisted-meadows.json" with { type: "json" };

const RAW_MAPS = {
  "autumn-leaves": autumnLeaves,
  "echo-isles": echoIsles,
  "last-refuge": lastRefuge,
  "shallow-grave": shallowGrave,
  springtime,
  tidehunters,
  "turtle-rock": turtleRock,
  "twisted-meadows": twistedMeadows,
};

const MAP_SLUGS = Object.keys(RAW_MAPS);

function loadMap(slug) {
  const raw = RAW_MAPS[slug];
  return {
    slug: raw.slug,
    name: raw.name,
    mapVersion: raw.mapVersion ?? undefined,
    w3cMapId: raw.w3cMapId,
    bounds: raw.bounds,
    image: raw.image,
    camps: raw.camps,
    starts: raw.starts,
    mines: raw.mines,
    shops: raw.shops,
    minimapUrl: `/maps/${slug}.png`,
    sourceFile: raw.sourceFile,
    generatedAt: raw.generatedAt,
  };
}

export const FIXTURE_MAPS = MAP_SLUGS.map(loadMap);

const MAP_BY_SLUG = new Map(FIXTURE_MAPS.map((m) => [m.slug, m]));

export const FIXTURE_ROUTES = [
  {
    slug: "human-archmage-autumn-leaves",
    title: "Archmage standard creep route",
    race: "human",
    vsRaces: [],
    level: "standard",
    map: { slug: "autumn-leaves", name: "Autumn Leaves v2" },
    hero: "hu-archmage",
    summary: "The standard Human opening: two green camps with the Archmage before expanding.",
    author: "Gym coaches",
    build: { slug: "human-fast-expand-archmage-rifles", title: "Archmage fast expand into Rifles" },
    patch: "2.0.3",
    mapVersion: "2.0",
    featured: true,
    publishedAt: "2026-08-22T10:00:00Z",
    updatedAt: "2026-09-12T10:00:00Z",
    stops: [
      { campId: "c09", time: 15, units: [{ icon: "hu-archmage", count: 1 }], note: "Scout in with the Archmage alone" },
      { campId: "c19", time: 75, note: "Second camp, keep Water Elemental topped up" },
      { campId: "c03", time: 140, note: "Bring 2 Footmen for this one" },
      { campId: "c05", time: 205, note: "Last camp before the expansion goes down" },
    ],
  },
  {
    slug: "orc-far-seer-autumn-leaves",
    title: "Far Seer wolves creep route",
    race: "orc",
    vsRaces: ["human"],
    level: "standard",
    map: { slug: "autumn-leaves", name: "Autumn Leaves v2" },
    hero: "or-far-seer",
    summary: "Far Seer with Feral Spirit, creeping the near side of Autumn Leaves before the Headhunter timing.",
    author: "Gym coaches",
    build: { slug: "orc-far-seer-headhunter-timing", title: "Far Seer Headhunter timing push" },
    patch: "2.0.3",
    mapVersion: "2.0",
    featured: false,
    publishedAt: "2026-08-29T10:00:00Z",
    updatedAt: "2026-08-29T10:00:00Z",
    stops: [
      { campId: "c10", time: 15, note: "Wolves tank, Far Seer stays back" },
      { campId: "c20", time: 70, condition: "Only if both wolves are still alive" },
      { campId: "c04", time: 135, units: [{ icon: "or-grunt", count: 2 }] },
      { campId: "c06", time: 230, note: "Re-summon wolves before this one if they died" },
    ],
  },
  {
    slug: "nightelf-tavern-echo-isles-beginner",
    title: "Tavern hero starter route",
    race: "nightelf",
    vsRaces: [],
    level: "beginner",
    map: { slug: "echo-isles", name: "Echo Isles v2" },
    hero: "nt-beastmaster",
    summary: "A gentle Echo Isles introduction: two easy camps, then home to buy the second hero item.",
    author: "Gym coaches",
    build: { slug: "nightelf-tavern-hero-hunts", title: "Tavern hero into Huntresses" },
    patch: "2.0.3",
    featured: false,
    publishedAt: "2026-09-03T10:00:00Z",
    updatedAt: "2026-09-03T10:00:00Z",
    stops: [
      { campId: "c08", time: 15, note: "Easy camp, safe to solo" },
      { campId: null, time: 60, action: "TP home", note: "Buy the Ring of Protection off the Wisp's stock" },
      { campId: "c12", time: 120, note: "Second easy camp" },
      { campId: "c05", time: 185, note: "Step up once both easy camps are clear" },
    ],
  },
  {
    slug: "undead-death-knight-autumn-leaves",
    title: "Death Knight fast-creep route",
    race: "undead",
    vsRaces: [],
    level: "standard",
    map: { slug: "autumn-leaves", name: "Autumn Leaves v2" },
    hero: "ud-death-knight",
    summary: "Death Coil first, Ghouls in tow, clearing the far side of Autumn Leaves for the Fiend timing.",
    author: "Gym coaches",
    build: { slug: "undead-fast-death-knight-fiends", title: "Fast Death Knight into Crypt Fiends" },
    patch: "2.0.3",
    mapVersion: "2.0",
    featured: false,
    publishedAt: "2026-09-09T10:00:00Z",
    updatedAt: "2026-09-09T10:00:00Z",
    stops: [
      { campId: "c13", time: 15, units: [{ icon: "ud-ghoul", count: 3 }] },
      { campId: "c07", time: 80, note: "Death Coil the caster first" },
      { campId: "c17", time: 150 },
      { campId: "c11", time: 220, note: "Last one before Crypt Fiends come out" },
    ],
  },
  {
    slug: "orc-shadow-hunter-last-refuge",
    title: "Shadow Hunter creep route",
    race: "orc",
    vsRaces: ["undead"],
    level: "standard",
    map: { slug: "last-refuge", name: "Last Refuge" },
    hero: "or-shadow-hunter",
    summary: "Shadow Hunter's Healing Wave keeps this cheap: four medium camps on Last Refuge before the push.",
    author: "Gym coaches",
    patch: "2.0.3",
    mapVersion: "1.4",
    featured: false,
    publishedAt: "2026-09-14T10:00:00Z",
    updatedAt: "2026-09-14T10:00:00Z",
    stops: [
      { campId: "c01", time: 15 },
      { campId: "c02", time: 80, condition: "Skip if the Undead scouted this side" },
      { campId: "c05", time: 145 },
      { campId: "c16", time: 210, note: "Home to Watch Tower after this one" },
    ],
  },
];

// Sanity check the seed data at import time (this file is also `node --test`ed
// directly by fixtures.test.mjs): every camp stop's campId must exist on its
// route's map, since camp contents are never invented, only looked up.
for (const route of FIXTURE_ROUTES) {
  const map = MAP_BY_SLUG.get(route.map.slug);
  if (!map) throw new Error(`fixture route ${route.slug} references unknown map ${route.map.slug}`);
  for (const stop of route.stops) {
    if (stop.campId && !map.camps.some((c) => c.id === stop.campId)) {
      throw new Error(`fixture route ${route.slug} references unknown camp ${stop.campId} on ${map.slug}`);
    }
  }
}
