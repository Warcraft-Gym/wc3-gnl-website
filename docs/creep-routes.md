# Creep routes

## Map catalogue script

`scripts/creep-maps/build.mjs` turns a W3Champions `.w3x`/`.w3m` map file
into a **map catalogue**: JSON describing every creep camp (its creeps,
summed level, xp and difficulty band), the two start spots, the gold mines,
the neutral-passive shops and the terrain bounds, plus a minimap PNG
(256x256, or narrower on one axis for a non-square map — see `image` and
the letterbox crop below). `src/lib/creep-routes/xp.mjs` has the pure
creep/hero XP math (`creepXp`, `heroXpForLevel`, `creepXpFactor`,
`heroLevelAfter`) later features use to route a hero through camps in xp
order.

Everything the script knows about a creep — its name, level and whether it
sleeps until attacked — comes from `src/lib/creep-routes/creeps.json`,
rebuilt entirely from Blizzard's own 1.27.1 game data (mirrored in the
`w3x2lni` repository) by `scripts/creep-maps/creep-table.mjs`; every entry
carries a `source` URL. The script never guesses: a creep id it cannot find
in that table makes catalogue building throw, naming the id, rather than
shipping a wrong level. `war3mapMap.blp` is always rendered into a square
256x256 canvas; a non-square map gets black letterbox padding on its
shorter axis, which `build.mjs` detects and crops (`minimap.mjs` +
`src/lib/creep-routes/minimap-crop.mjs`) so the PNG's aspect matches
`bounds`'s aspect and the catalogue's normalised camp/start/mine
coordinates line up with it directly; the crop result is recorded as
`image: { width, height }`. If a map's real letterbox doesn't match its
bounds-implied aspect closely enough, the build throws rather than ship a
misaligned image. See `scripts/creep-maps/README.md` for exactly how to
get map files, rebuild the creep table, run `build.mjs` (including its
`--creeps <path>` override for testing against a scratch table), and read
the JSON it writes.

This feature ships the script, its fixtures and tests, the SLK-sourced
creep table (83 rawcodes) and generated catalogues for eight of the nine
bundle maps (`src/lib/creep-routes/maps/<slug>.json` plus their minimaps at
`public/maps/<slug>.png`): `autumn-leaves`, `echo-isles`, `last-refuge`,
`shallow-grave`, `springtime`, `tidehunters`, `turtle-rock`,
`twisted-meadows`. `northern-isles` is not currently regenerated — its real
minimap's letterbox doesn't pass the aspect sanity check (see the
`001b-slk-table-and-letterbox` feature's handoff for the pixel-level
investigation) — so it was dropped rather than shipped misaligned or with
its creep data left stale. Later features build the route-planning UI on
top of these catalogues.

## Data model

`src/lib/creep-routes/types.ts` defines the domain types the site and the
data layer share:

- **`CreepMap`** — the catalogue shape (`slug`, `name`, `mapVersion`,
  `w3cMapId`, `bounds`, `image`, `camps[]`, `starts[]`, `mines[]`, `shops[]`)
  plus `minimapUrl`: `/maps/<slug>.png` for fixtures, the Sanity image asset
  URL once a map is published. A `MapCamp`'s `level`/`xp`/`band` are the
  camp's own totals (sum of its creeps' levels/base xp, and a difficulty
  label) — not a hero's; see "Day clock" below for how a hero's own
  level/xp are derived per stop.
- **`CreepRoute`** — `slug`, `title`, `race`, `vsRaces[]` (empty = any),
  `level` (`"standard"` or `"beginner"`), `map: { slug, name }`, an optional
  `hero` (icon key into `GAME_ICON_OPTIONS`), `summary`, `author` and credit
  fields, an optional `build` link to a companion `buildOrder`, `patch`,
  `mapVersion` (the catalogue version the route was written against),
  `featured`, `publishedAt`, `updatedAt`, `stops[]`, and an optional
  `description`.
- **`RouteStop`** — `campId: string | null`, `time` (real seconds), and
  optionally `action` (for a `campId: null` base action like `"TP home"`,
  buying from a shop, or taking an expansion), `units` (what the *player*
  brings to the stop — never the camp's contents, which are always looked
  up from the map by `campId`), `note`, `condition`.

`src/lib/creep-routes/fixtures.ts` (backed by the plain-JS
`fixtures.mjs`, so `node --test` can check it directly — see
`fixtures.test.mjs`) ships `FIXTURE_MAPS` (one per generated catalogue) and
five seed `FIXTURE_ROUTES` covering every race, at least two maps (three on
Autumn Leaves), a beginner route, a route with `vsRaces` set, a stop with a
`condition`, and a non-camp stop (`campId: null, action: "TP home"`).

## Day clock

`src/lib/creep-routes/clock.mjs` is the pure day/night clock math (plain
JS, no TypeScript syntax, so `node --test` runs `clock.test.mjs` with no
loader; `.ts` modules import it directly, e.g. `import { toDayClock } from
"./clock.mjs"`, the same way `src/lib/w3c.ts` imports
`w3c-vs-race.mjs`):

- The game clock starts at **12:00 (noon)** at real 0:00; **20 real seconds
  = 1 game hour**, so a full day is 480 real seconds (8 minutes) and wraps.
- `toDayClock(realSecondsOrClock)` → `"HH:MM"`. Accepts real seconds or a
  `"m:ss"` string.
- `fromDayClock("HH:MM")` → the real `"m:ss"` clock of that day clock's
  first occurrence from game start.
- `parseAnyClock(str)` accepts either a real `"m:ss"` clock (e.g. `"1:30"`)
  or a day clock `"HH:MM"` (e.g. `"16:30"`) and returns real seconds.
  Disambiguation: a value whose first field is **>= 12**, or which is
  written with a **leading zero** (e.g. `"06:00"`), is read as a day clock;
  anything else (`"1:30"`, `"9:45"`) is a real clock. In practice a route
  stop's real time is never >= 12 minutes into the clock nor zero-padded,
  so this never collides in authored data.
- `isNight(realSeconds)` is true for game time **18:00-05:59** (real
  seconds `[120, 360)` modulo the 480 s day/night cycle).
- `parseClock`/`formatClock` are local copies of
  `src/lib/builds/types.ts`'s `"m:ss"` <-> seconds helpers (same output),
  kept here so `clock.mjs` stays plain JS with no cross-module TS
  dependency.

`src/lib/creep-routes/derive.mjs`'s `deriveRoute(route, map, { startLevel })`
runs a hero through a route's stops in order, folding camp stops through
`xp.mjs`'s `heroLevelAfter` math (skipping non-camp stops) and attaching
`toDayClock`/`isNight` per stop. `routeBounds(route)` is a pure
first/last-time and stop-count helper.

## Review flow

Sanity is the store; a `creepRoute` document has the exact same review gate
as `buildOrder`: `reviewStatus` defaults to `"approved"`, but publishing is
**blocked by a custom validation** while it's `"pending"` (public
submissions land as drafts, reviewed the same way — see
`docs/build-orders.md`'s "How a build gets on the site" for the mechanics,
identical here). The Studio desk (`src/sanity/structure.ts`) gets a "Creep
routes" group with **Pending review** / **Approved** / **All creep routes**
/ **Maps** lists, same filters as build orders. A `creepRoute` references
its `creepMap` (required) and, optionally, a companion `buildOrder`.

`src/lib/creep-routes/routes.ts` and `maps.ts` mirror
`src/lib/builds/builds.ts`: Sanity first when configured
(`coalesce(reviewStatus, "approved") == "approved"`, `map->{...}`
dereferenced, 300 s ISR revalidate), the bundled fixtures in development
when Sanity is unreachable or empty, and `[]` in production without Sanity.
Each Sanity stop's `time` is stored as a `"m:ss"` string (validated with
the same regex as build steps) and converted to real seconds
(`clock.mjs`'s `parseClock`) when read, since the domain type
(`RouteStop.time`) is numeric. A route whose `map` reference doesn't
resolve (deleted, or — like Northern Isles today — never published) is
**dropped from the list** rather than shown broken, with a `console.warn`
in development.

The Sanity webhook (`/api/revalidate`, `PATHS.creepRoute` /
`PATHS.creepMap` in `src/app/api/revalidate/route.ts`) purges
`/learn/creep-routes`, the route's detail page, `/`, and the (future)
`/api/creep-routes` endpoints when a `creepRoute` changes, and
`/learn/creep-routes` plus the (future) `/api/creep-maps/<slug>` when a
`creepMap` changes.

## Publishing a map

`scripts/creep-maps/publish.mjs <slug...>` (or `--all`) reads a generated
catalogue (`src/lib/creep-routes/maps/<slug>.json`) and its minimap
(`public/maps/<slug>.png`), uploads the PNG as a Sanity image asset, and
`createOrReplace`s a `creepMap` document with a deterministic id
(`creepMap.<slug>`), so re-running is safe:

```
SANITY_API_WRITE_TOKEN=<editor token> node scripts/creep-maps/publish.mjs autumn-leaves echo-isles
SANITY_API_WRITE_TOKEN=<editor token> node scripts/creep-maps/publish.mjs --all
```

Needs `SANITY_API_WRITE_TOKEN` (Editor scope, same token build-order
submissions use); the script exits 1 with a clear message if it's missing,
or if a slug has no catalogue/minimap on disk. `@sanity/client` isn't a
direct dependency of this repo (it's transitive, via `next-sanity`); the
script resolves it through `next-sanity`'s own dependency tree
(`require.resolve("@sanity/client", { paths: [...] })`) instead of adding
one. **Not run as part of this feature** — no write token was available —
so the published documents don't exist in Sanity yet; run it once a token
is configured to get the eight generated maps live.

Re-publishing overwrites any manual camp-position nudge an editor made in
the Studio (the "Generated (edit with care)" field group warns about
this) — same trade-off as the build-orders NDJSON seed.
