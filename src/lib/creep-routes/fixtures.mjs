/**
 * Fixture data for creep maps and routes, plain JavaScript so `node --test`
 * can check it with no loader (see `fixtures.test.mjs`). `fixtures.ts`
 * re-exports this as typed `CreepMap[]`/`CreepRoute[]`.
 *
 * Maps: one `CreepMap` per generated catalogue under `maps/*.json` (every
 * map in `map-sources/` — see `docs/creep-routes.md`),
 * with `minimapUrl` pointing at the matching `public/maps/<slug>.png`.
 * `fixtures.test.mjs` asserts this list has exactly one entry per file in
 * that directory, so a future catalogue can't be forgotten the way
 * `northern-isles` was (F006 found it on disk but unwired).
 *
 * Routes: seed routes for local dev and as the fallback when Sanity has
 * none. No time dimension — a route is an ordered list of stops, nothing
 * more; camp ids are real camp ids taken from the matching map's catalogue
 * (never invented). Authors "Gym coaches".
 */
// The per-catalogue static imports live in the generated
// `maps/index.mjs` (written by `scripts/creep-maps/add-map.mjs`): the
// bundler cannot read a directory, and hand-maintaining one import per map
// is how Northern Isles once shipped missing from every map select.
import { killsProblem } from "./kills.mjs";
import { RAW_MAPS } from "./maps/index.mjs";
import { placeIds, placeProblem } from "./place.mjs";

const MAP_SLUGS = Object.keys(RAW_MAPS);

function loadMap(slug) {
  const raw = RAW_MAPS[slug];
  return {
    slug: raw.slug,
    name: raw.name,
    mapVersion: raw.mapVersion ?? undefined,
    w3cMapId: raw.w3cMapId,
    bounds: raw.bounds,
    terrainBounds: raw.terrainBounds,
    cameraBounds: raw.cameraBounds,
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
    tags: ["fast-expand", "archmage"],
    featured: true,
    publishedAt: "2026-08-22T10:00:00Z",
    updatedAt: "2026-09-12T10:00:00Z",
    stops: [
      { campId: "c09", units: [{ icon: "hu-archmage", count: 1 }], note: "Scout in with the Archmage alone" },
      { campId: "c19", note: "Second camp, keep Water Elemental topped up" },
      { campId: "c03", note: "Bring 2 Footmen for this one" },
      { campId: "c05", kills: [{ row: 0, n: 1, set: 0 }, { row: 2, n: 1, set: 0 }], note: "Last camp before the expansion goes down" },
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
    tags: ["far-seer", "wolves"],
    featured: false,
    publishedAt: "2026-08-29T10:00:00Z",
    updatedAt: "2026-08-29T10:00:00Z",
    stops: [
      { campId: "c10", note: "Wolves tank, Far Seer stays back" },
      { campId: "c20", condition: "Only if both wolves are still alive" },
      { campId: "c04", units: [{ icon: "or-grunt", count: 2 }] },
      { campId: "c06", note: "Re-summon wolves before this one if they died" },
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
    // Re-pointed when the catalogue moved to Echo Isles v2.2, which added
    // three camps and renumbered the rest: the ids below are the camps whose
    // creep composition matches the ones this route was written for
    // (c08 -> c12, c12 -> c14, c05 -> c08). Without this the last stop, meant
    // as "step up", pointed at a medium level-13 camp instead of the easy
    // level-8 murlocs — see `docs/creep-routes.md`, "When the ladder pool
    // rotates".
    mapVersion: "2.2",
    featured: false,
    publishedAt: "2026-09-03T10:00:00Z",
    updatedAt: "2026-09-03T10:00:00Z",
    stops: [
      { campId: "c12", note: "Easy camp, safe to solo" },
      { campId: null, action: "TP home", note: "Buy the Ring of Protection off the Wisp's stock" },
      { campId: "c14", note: "Second easy camp" },
      { campId: "c08", note: "Step up once both easy camps are clear" },
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
      { campId: "c13", units: [{ icon: "ud-ghoul", count: 3 }] },
      { campId: "c07", note: "Death Coil the caster first" },
      { campId: "c17" },
      { campId: "c11", note: "Last one before Crypt Fiends come out" },
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
    mapVersion: "1.5",
    featured: false,
    publishedAt: "2026-09-14T10:00:00Z",
    updatedAt: "2026-09-14T10:00:00Z",
    stops: [
      { campId: "c01", kills: [{ row: 0, n: 1 }, { row: 2, n: 1 }, { row: 1, n: 1 }], note: "Priest first so it can't heal" },
      { campId: "c02", condition: "Skip if the Undead scouted this side" },
      { campId: "c05" },
      { campId: "c16", kills: [{ row: 0, n: 1 }], leaveRest: true, note: "Take the item and go home to Watch Tower" },
    ],
  },
  {
    slug: "nightelf-aow-turtle-rock",
    title: "Test route: AoW at the ogre camp, then creep or harass",
    race: "nightelf",
    vsRaces: [],
    level: "standard",
    map: { slug: "turtle-rock", name: "Turtle Rock v2" },
    hero: "ne-keeper-of-the-grove",
    summary: "A made-up route to test splits and waypoints. Not for play.",
    author: "Gym coaches",
    patch: "2.0.3",
    mapVersion: "2.0",
    featured: false,
    publishedAt: "2026-10-02T10:00:00Z",
    updatedAt: "2026-10-02T10:00:00Z",
    stops: [
      {
        campId: null,
        action: "Plant the Ancient of War",
        place: { kind: "build", at: { x: 0.5, y: 0.83 } },
        units: [{ icon: "ne-ancient-of-war", count: 1 }],
      },
      { campId: "c15", units: [{ icon: "ne-ancient-of-war", count: 1 }], note: "The Ancient tanks the ogres" },
      { campId: "c07", note: "Keeper takes the turtles" },
      {
        campId: null,
        // Either/or: each way goes on to its own end, nothing follows the split.
        split: {
          mode: "xor",
          arms: [
            {
              label: "No one at their natural",
              stops: [{ campId: "c08", note: "Take their natural's turtles" }, { campId: "c04" }, { campId: "c01" }],
            },
            {
              label: "They are at their natural",
              stops: [{ campId: null, action: "Harass their base", place: { kind: "attack", at: { start: "3" } } }],
            },
          ],
        },
      },
    ],
  },
  {
    slug: "human-no-expansion-tidehunters",
    title: "Test route: no expansion",
    race: "human",
    vsRaces: [],
    level: "standard",
    map: { slug: "tidehunters", name: "Tidehunters" },
    hero: "hu-archmage",
    summary: "A made-up route to test splits and waypoints. Not for play.",
    author: "Gym coaches",
    patch: "2.0.3",
    mapVersion: "1.2",
    featured: false,
    publishedAt: "2026-10-02T11:00:00Z",
    updatedAt: "2026-10-02T11:00:00Z",
    stops: [
      { campId: "c11", units: [{ icon: "hu-militia", count: 5 }], note: "Call to Arms, clear the marketplace camp together" },
      {
        campId: null,
        split: {
          mode: "and",
          arms: [
            { stops: [{ campId: "c04", units: [{ icon: "hu-footman", count: 3 }], note: "The hero and the army take the turtles" }] },
            { stops: [{ campId: "c19", hero: false, units: [{ icon: "hu-militia", count: 4 }], note: "The militia finish the sea giant camp" }] },
          ],
        },
      },
      { campId: "c05", note: "Both groups meet at the gnolls" },
    ],
  },
  // veS's two Death Knight routes from Sanity production (read only), rebuilt with splits. His
  // notes are his own words, trimmed to the part that belongs to each stop; actions and way labels
  // are ours. `start: 1`: his first camps sit by player 1's base (the live documents leave it unset).
  {
    slug: "undead-ves-autumn-leaves",
    title: "Early creep route vs. solo Blademaster Wind Walk",
    race: "undead",
    vsRaces: ["orc"],
    level: "standard",
    map: { slug: "autumn-leaves", name: "Autumn Leaves v2" },
    start: 1,
    hero: "ud-death-knight",
    summary: "This is based on Happy vs. Soin game. You can use this creep route if Blademaster tries to snipe items early and gives you a bit of space.",
    author: "veS",
    patch: "2.0.3",
    mapVersion: "2.0",
    featured: false,
    publishedAt: "2026-10-02T12:00:00Z",
    updatedAt: "2026-10-02T12:00:00Z",
    description: [
      "Your main goal in early game is to hit lvl 3 as soon as possible. Scouting the enemy hero and seeing their ability choices will help you inform which creep route is optimal. As you creep towards lvl 3, you need to assess whether you can be aggressive, or whether you must play safer.",
    ],
    stops: [
      {
        campId: null,
        // ponytail: the two camp orders are really xor, but the level-3 choice follows both and a
        // split cannot sit inside a path, so this stays "or" with the level-3 split shared after.
        split: {
          mode: "or",
          arms: [
            {
              label: "Standard",
              stops: [
                {
                  campId: "c06",
                  units: [{ icon: "ud-ghoul", count: 2 }],
                  kills: [{ row: 1, n: 1 }, { row: 0, n: 1 }],
                  note: "Standard opening camp in almost all scenarios vs. Orc. Bring 2 ghouls if you expect Orc to be creeping themselves. Bring 3 ghouls if you expect to be harassed.",
                },
                {
                  campId: "c08",
                  units: [{ icon: "ud-ghoul", count: 5 }],
                  kills: [{ row: 1, n: 1 }, { row: 2, n: 1 }],
                  condition: "Do not attempt if you face a build with strong early presence, e.g. Far Seer/Headhunters",
                  note: "You may go for this camp if you face solo Blademaster with Wind Walk. You need to bring at least 5 ghouls, but you will be able to buy Circlet and Dust for Wind Walk.",
                },
              ],
            },
            {
              label: "vs. Mirror Image Blademaster",
              stops: [
                { campId: "c08", units: [{ icon: "ud-ghoul", count: 5 }], kills: [{ row: 1, n: 1 }, { row: 2, n: 1 }] },
                // ponytail: no units on the second camp; the ghouls are already with the hero.
                { campId: "c06", kills: [{ row: 1, n: 1 }, { row: 0, n: 1 }] },
              ],
            },
          ],
        },
      },
      {
        campId: null,
        // ponytail: no split caption ("Reaching level 3"); the path labels carry it.
        split: {
          mode: "xor",
          arms: [
            {
              label: "Safe",
              stops: [
                {
                  campId: "c03",
                  units: [{ icon: "rodofnecromancy", count: 1 }],
                  kills: [{ row: 1, n: 2 }],
                  note: "Going for this camp is a safer option, because it's closer to your base. After creeping the shop, bring additional Rod of Necromancy. Kill two trolls first, then finish with the magi.",
                },
              ],
            },
            {
              label: "Risky; vs. a passive Orc",
              stops: [
                {
                  campId: "c04",
                  kills: [{ row: 1, n: 2 }],
                  note: "Sometimes your Orc opponent will be very passive. In this case, if you had a smooth early game and you feel confident, you can go for this camp. This will ensure you hit level 3 and that you will deprive them of important camp.",
                },
                {
                  campId: null,
                  action: "Push their burrows and T2 buildings",
                  place: { kind: "attack", at: { start: "0" } },
                  note: "If you manage to clear this camp as well, you can use this momentum and go for their burrows/t2 buildings.",
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    slug: "undead-ves-echo-isles",
    title: "Early creep route vs. Demon Hunter and Naga",
    race: "undead",
    vsRaces: ["nightelf"],
    level: "standard",
    map: { slug: "echo-isles", name: "Echo Isles v2" },
    start: 1,
    hero: "ud-death-knight",
    summary: "Principles of this creep route can be applied on other maps as well. This guide is based on Happy vs. Life replay analysis.",
    author: "veS",
    patch: "2.0.3",
    mapVersion: "2.2",
    featured: false,
    publishedAt: "2026-10-02T12:00:00Z",
    updatedAt: "2026-10-02T12:00:00Z",
    stops: [
      {
        campId: "c11",
        condition: "Only on 1 base",
        note: "Standard first camp if you play to stay on 1 base. If you go for Naga 2nd, bring 2 ghouls here.",
      },
      {
        campId: "c02",
        units: [{ icon: "ud-ghoul", count: 6 }],
        note: "This is the quickest and the most efficient lvl 2 creep route on this map. Bring 6 ghouls total to this camp.",
      },
      {
        campId: null,
        action: "Scout where their Ancient of War goes",
        place: { kind: "scout", at: { start: "1" } },
        // A lone unit scouts (veS does not say which): no line on the hero's way.
        hero: false,
        note: "Meanwhile, scout Night Elf and check if their Ancient of War is moving towards the marketplace.",
      },
      {
        campId: "c05",
        condition: "Creep only if greedy",
        note: "Buy Boots (for your Naga) and Dust (to reveal their archers during a night) here either way. Your goal here is to prepare for mid-game and the Naga vs. Naga fight. You CAN creep this, if you feel greedy, but you will lose HP on your ghouls and will be unable to contest NE in mid-game.",
      },
      {
        campId: "c03",
        condition: "Only if Elf placed their AoW on their green ogre camp.",
        kills: [{ row: 3, n: 1 }],
        note: "In mid-game your goal is to stop Elf from creeping a big camp with their Ancient, that now has moved towards it. In most cases they will move towards the marketplace, as it gives a lot of XP and a good consumable. Your goal here is to a) stop Elf from creeping this b) if possible, do it yourself. Whoever gets this camp in mid-game, achieves a big advantage.",
      },
    ],
  },
];

// Sanity check the seed data at import time (this file is also `node --test`ed
// directly by fixtures.test.mjs): every camp stop's campId must exist on its
// route's map, since camp contents are never invented, only looked up. Also
// carries the map's own `minimapUrl` onto `route.map` (mirroring the Sanity
// projection in routes.ts) so every fixture route can show a map thumbnail
// without a second lookup (F009-followup-2).
for (const route of FIXTURE_ROUTES) {
  const map = MAP_BY_SLUG.get(route.map.slug);
  if (!map) throw new Error(`fixture route ${route.slug} references unknown map ${route.map.slug}`);
  route.map.minimapUrl = map.minimapUrl;
  for (const stop of route.stops.flatMap((s) => [s, ...(s.split?.arms.flatMap((arm) => arm.stops) ?? [])])) {
    const camp = stop.campId && map.camps.find((c) => c.id === stop.campId);
    if (stop.campId && !camp) {
      throw new Error(`fixture route ${route.slug} references unknown camp ${stop.campId} on ${map.slug}`);
    }
    const problem = camp && stop.kills && killsProblem(stop.kills, camp.creeps.map((c) => c.count));
    if (problem) throw new Error(`fixture route ${route.slug} stop ${stop.campId}: ${problem}`);
    const placeIssue = stop.place && placeProblem(stop.place, placeIds(map));
    if (placeIssue) throw new Error(`fixture route ${route.slug}: ${placeIssue}`);
  }
}
