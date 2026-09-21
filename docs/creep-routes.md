# Creep routes

## Map catalogue script

`scripts/creep-maps/build.mjs` turns a W3Champions `.w3x`/`.w3m` map file
into a **map catalogue**: JSON describing every creep camp (its creeps,
summed level, xp and difficulty band), the two start spots, the gold mines,
the neutral-passive shops and the playable bounds (see below), plus a
minimap PNG (256x256, or narrower on one axis for a non-square map — see
`image` and the letterbox crop below). `src/lib/creep-routes/xp.mjs` has the pure
creep/hero XP math (`creepXp`, `heroXpForLevel`, `creepXpFactor`,
`heroLevelAfter`) later features use to route a hero through camps in xp
order.

Everything the script knows about a creep — its name, level and whether it
sleeps until attacked — comes from `src/lib/creep-routes/creeps.json`,
rebuilt entirely from Blizzard's own 1.27.1 game data (mirrored in the
`w3x2lni` repository) by `scripts/creep-maps/creep-table.mjs`; every entry
carries a `source` URL. The script never guesses: a creep id it cannot find
in that table makes catalogue building throw, naming the id, rather than
shipping a wrong level. See `scripts/creep-maps/README.md` for exactly how
to get map files, rebuild the creep table, run `build.mjs` (including its
`--creeps <path>` override for testing against a scratch table), and read
the JSON it writes.

This feature ships the script, its fixtures and tests, the SLK-sourced
creep table (83 rawcodes) and generated catalogues for all nine bundle
maps (`src/lib/creep-routes/maps/<slug>.json` plus their minimaps at
`public/maps/<slug>.png`): `autumn-leaves`, `echo-isles`, `last-refuge`,
`northern-isles`, `shallow-grave`, `springtime`, `tidehunters`,
`turtle-rock`, `twisted-meadows`. Later features build the route-planning
UI on top of these catalogues.

### The playable rectangle (F001-followup-3)

Camps/starts/mines/shops normalise over the map's **playable rectangle**,
not the raw terrain grid. `war3map.w3e` (terrain) covers a wider area than
the minimap image (`war3mapMap.blp`, which is also what the in-game
minimap and coff-creeps' Liquipedia-preview reference show) actually
draws: `war3map.w3i` records an unplayable border on each side as
`complements` (`int[4]`, file order **left, right, bottom, top**, one unit
= one 128-world-unit terrain tile). `map-info.mjs`'s
`computePlayableBounds(terrainBounds, complements)` computes
`playable = { xMin: terrainBounds.xMin + left·128, xMax: terrainBounds.xMax
− right·128, yMin: terrainBounds.yMin + bottom·128, yMax: terrainBounds.yMax
− top·128 }`; the catalogue's `bounds` field *is* this playable rect (kept
alongside the raw `terrainBounds` and `cameraBounds`, both for reference
only). Mapping over the terrain rect instead put every marker roughly 23%
too close to the map's centre — the bug this feature fixes. Verified
against coff-creeps' own Autumn Leaves camp/spawn positions
(`coff-reference.test.mjs`, backed by
`scripts/creep-maps/__fixtures__/autumn-leaves/coff-reference.json`): every
one of our 20 camps and both starts land within 0.01 normalised distance
of coff's (max observed: **0.0000**).

A creep/start/mine/shop unit placed in the unplayable border (decorative,
never actually reachable) is **dropped**, never clamped into `[0, 1]` —
`build.mjs` names the count in its stdout summary line
(`N dropped outside the playable rect`) when it happens.

Camp ids are still ordered by distance-then-angle from the map's *terrain*
centre, not the playable rect's own (often off-centre — the unplayable
border isn't symmetric on several maps) one: this keeps ids stable across
this switch, since it's purely a stdout/data-visibility rounding decision,
not a statement about where any camp actually is.

`war3mapMap.blp` is always rendered into a square 256x256 canvas; a
non-square map gets black letterbox padding on its shorter axis, which
`build.mjs` detects and crops (`minimap.mjs` +
`src/lib/creep-routes/minimap-crop.mjs`) so the PNG's aspect matches
`bounds`'s (playable) aspect and the catalogue's normalised coordinates
line up with it directly; the crop result is recorded as
`image: { width, height }`. The crop is accepted if the result's aspect is
within 3% of `bounds`'s aspect, **or** if it matches the in-game editor's
own letterbox rounding: the editor rounds a letterboxed map's shorter
content dimension *up* to a multiple of 16 pixels (and stretches slightly
to fill it) rather than keeping the exact fraction, so
`expectedHeight = ceil16(256 / boundsAspect)` (symmetric on width for a
tall map) is accepted within 1 row/column. This is why `northern-isles`
(playable aspect 1.2558, `ceil16(256/1.2558) = 208`) now builds — under the
old terrain-rect aspect (1.3333) its real letterbox missed the plain 3%
tolerance outright; under the playable aspect it's within tolerance
already. `echo-isles` (playable aspect 1.381) needed the 16-px rule itself:
`ceil16(256/1.381) = 192`, a 3.4% gap from the plain check. If neither
check passes, the build throws rather than ship a misaligned image.

## Data model

`src/lib/creep-routes/types.ts` defines the domain types the site and the
data layer share:

- **`CreepMap`** — the catalogue shape (`slug`, `name`, `mapVersion`,
  `w3cMapId`, `bounds`, optional `terrainBounds`/`cameraBounds`
  (reference-only, see "The playable rectangle" above), `image`, `camps[]`,
  `starts[]`, `mines[]`, `shops[]`) plus `minimapUrl`: `/maps/<slug>.png`
  for fixtures, the Sanity image asset URL once a map is published. A
  `MapCamp`'s `level`/`xp`/`band` are the camp's own totals (sum of its
  creeps' levels/base xp, and a difficulty label) — not a hero's; see "Day
  clock" below for how a hero's own level/xp are derived per stop.
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

## XP model

`src/lib/creep-routes/xp.mjs`'s `creepXp`/`heroXpForLevel`/`creepXpFactor`
are sourced from https://warcraft.wiki.gg/wiki/Hero_(Warcraft_III)#Experience
— a hero killing a creep camp gains XP per creep in it, tapered by
`creepXpFactor(heroLevel)` (the *camp's* factor, fixed to the hero's level
at the moment the camp is engaged, per the wiki's rule) to how far past the
creeps' own level the hero has already climbed.

The wiki's table gives that factor as a fraction (e.g. 0.5 at hero level
4), so `creepXp(level) * factor` is not always a whole number — a level-4
creep grants a level-4 hero `85 * 0.5 = 42.5` xp by the raw formula.
Warcraft III itself only ever awards whole XP in-game, so **we floor each
creep's XP grant** (`Math.floor(creepXp(level) * factor)`, not the running
total) before adding it to the hero's total — `heroLevelAfter` (`xp.mjs`)
and `deriveRoute` (`derive.mjs`) both do this at the point of the grant.
This is our modelling choice, not something the wiki states explicitly;
flooring per creep (rather than flooring the camp or route total) keeps
the total deterministic regardless of how creeps are grouped or ordered
within a camp.

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
resolve (deleted, or — like every catalogue today, none of the nine
`creepMap` documents have been published to Sanity yet, see "Publishing a
map" below — never published) is **dropped from the list** rather than
shown broken, with a `console.warn` in development.

The Sanity webhook (`/api/revalidate`, `PATHS.creepRoute` /
`PATHS.creepMap` in `src/app/api/revalidate/route.ts`) purges
`/learn/creep-routes`, the route's detail page, `/`, and the
`/api/creep-routes` endpoints when a `creepRoute` changes, and
`/learn/creep-routes` plus the `/api/creep-maps` endpoints when a
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
one. **Not run yet** — no write token was available in the environments
these scripts were developed in — so the published documents don't exist
in Sanity yet; run it once a token is configured to get all nine
generated maps live. See "When the ladder pool rotates" below for when to
re-run this after a map file changes.

Re-publishing overwrites any manual camp-position nudge an editor made in
the Studio (the "Generated (edit with care)" field group warns about
this) — same trade-off as the build-orders NDJSON seed.

## Pages

`/learn/creep-routes` (`src/app/(site)/learn/creep-routes/page.tsx`) is the
list, copying `/learn/builds`' pattern: an async `searchParams`, filters
validated against the known ids and re-applied with `filterCreepRoutes`
(`src/lib/creep-routes/routes.ts`), rows (`RouteRow`) and an empty state
with "Clear filters" and "Submit a route" (the submit form itself is F005;
the link exists now and 404s until then). Both list and detail pages are
gated by `CREEP_ROUTES_LIVE` in `src/lib/flags.ts`.

**URL params**, all optional, invalid values silently ignored:

| Param | Values | Notes |
|---|---|---|
| `race` | a `BuildRace` id (`human`/`orc`/`nightelf`/`undead`) | the route's own race |
| `vs` | a `BuildRace` id | matches a route written for that opponent, or for any opponent (`vsRaces: []`) |
| `map` | a catalogue slug (e.g. `autumn-leaves`) | validated against the live map list, not a fixed enum |
| `level` | `standard` \| `beginner` | |
| `q` | free text, capped at 80 chars | matched against title, summary, author, map name |
| `sort` | `updated` (default) \| `title` | |

The filter bar (`RouteFilters`, `src/components/creep-routes/RouteFilters.tsx`)
writes every change straight to the URL with `router.replace(..., { scroll:
false })` — search is debounced 300 ms, everything else applies
immediately — so a filtered view is a shareable, bookmarkable link, and the
list stays one page to search engines (canonical `/learn/creep-routes`
regardless of query string). It is a sibling of `MatchupPicker`
(`src/components/builds/MatchupPicker.tsx`), not a reuse: a build's
`difficulty` and a route's `level` are different enums, and the route list
also needs a map select builds has no equivalent of. See `DESIGN.md`'s
"Creep routes → List" section for the row anatomy and unit words.

The Learn hub's `creep-routes` category card and the primary nav's "Creep
routes" item (conditional on `CREEP_ROUTES_LIVE`, `src/components/layout/nav-items.ts`)
both point at this list, replacing the old image-only category page for
that slug; `src/app/(site)/learn/[category]/page.tsx` redirects
`/learn/creep-routes` to the list explicitly (belt and suspenders — the
App Router already resolves the static `creep-routes/page.tsx` ahead of
the dynamic `[category]` segment for that exact path). The existing guide
"Reading creep camps and item drops" isn't lost: it's linked from the list
page and still lives at `/learn/guide/reading-creep-camps-and-drops`.
`src/app/sitemap.ts` lists the list page (via `LEARN_CATEGORIES`, same as
every other category) and every published route slug.

`/learn/creep-routes/<slug>` (`src/app/(site)/learn/creep-routes/[slug]/page.tsx`)
is the detail page shipped in an earlier feature. It follows the build-order detail page's shape: a race showcase
header with the matchup, the route's level badge ("Standard"/"Beginner"),
map name and `mapVersion`, author/maintainer/updated/source, `HowTo` +
`BreadcrumbList` JSON-LD (`src/lib/seo.ts`), a companion-build card when
`route.build` is set, a Discord discussion link and up to three related
routes (same map or same race).

The map and the step table are the page's core: `CreepMapPlayground.tsx`
(a client island next to the page) lifts one piece of state, the active
stop index, so `CreepMap` (`src/components/creep-routes/CreepMap.tsx`) and
`RouteStepTable` (`RouteStepTable.tsx`) stay in sync when you press play.
`CreepMap` always renders its `<svg>` — sized by CSS (`viewBox` + `w-full
h-auto`), not gated behind a client-only `ResizeObserver` — so the map's
camps, path and stop badges are present in the server-rendered HTML a curl
or a crawler sees, not only after hydration; the `ResizeObserver` still
runs, but only to place the hover/focus `CampDetails` panel in real pixels.
See `DESIGN.md`'s "Creep routes" section for the camp band colours, the
mark shapes and the day-clock convention this page and its components
follow.

`CreepMap`'s props (`map`, `route?`, `activeStop?`, `onCampSelect?`,
`highlightCamps?`, `className?`) are deliberately reusable beyond this
page: `onCampSelect` is unused here but renders camps as real `<button>`s
(via `foreignObject`) instead of plain `<g>`s when given, wired up by the
editor below (`RouteSubmitForm`); `highlightCamps` was left ready for a
list/filter page to dim or ring a subset of camps, but F004's list
(`/learn/creep-routes`) ended up not using it — no per-row map thumbnail,
see `DESIGN.md`'s "List" section — so it remains unused until a future
map-first view wants it.

## Submission

`/learn/creep-routes/submit` (`src/app/(site)/learn/creep-routes/submit/`)
is the public submission flow: click camps on the map, fill in the setup
row and the details form, submit — reviewed the same way a build-order
submission is. See `DESIGN.md`'s "Editor" section for what the author
sees; this section is the mechanics.

- **`RouteSubmitForm` → `RouteSetup` + `RouteEditor` (`CreepMap` in edit
  mode + `StopEditor` → `StopRow`)** is the component tree, split so no
  file runs long: `RouteSetup` is the map/race/opponent(s)/level/hero/
  companion-build row, `RouteEditor` is a thin layout wrapper (map left,
  `StopEditor` right), `StopEditor` owns the stop list's mutations (add a
  camp stop, add a base action, reorder, remove, sort by time) and the
  live `deriveRoute` readout, `StopRow` is one stop.
- **`src/lib/creep-routes/submission.mjs` + `submission.ts`.** Same split
  as `fixtures.mjs`/`fixtures.ts`: the `.mjs` file is the pure, plain-JS
  implementation `submission.test.mjs` checks directly with `node --test`
  (no loader, no cross-module TS import — see the file's own header
  comment for why), the `.ts` file is a typed façade the rest of the app
  imports (TS's untyped-JS inference on the raw `.mjs` exports is too loose
  to use as-is — it infers e.g. `vsRaces: never[]` — so every export is
  re-typed on the way out). `createSubmissionSchema({ maps, iconKeys,
  buildSlugs })` builds the zod schema against a **live catalogue** passed
  in by the caller — every map's slug and real camp ids (a stop's `campId`
  is checked against the *chosen* map's own camps in a `superRefine`,
  never a global camp-id set), every valid `GAME_ICON_OPTIONS` key, and
  known build slugs for the optional companion link. A stop's `time`
  accepts either clock form and transforms straight to real seconds
  (`parseAnyClock`, `clock.mjs`); a `campId: null` stop requires `action`.
  `toCreepRouteDraft(valid, mapDocId, buildDocId?)` is pure and
  synchronous — no Sanity client — so it's directly testable; the caller
  resolves both ids.
- **`src/lib/creep-routes/submit.ts`** (server-only) is `createBuildDraft`'s
  twin: `canAcceptSubmissions()` is `Boolean(projectId && token)`, read
  both by the server action (to gate the actual write) and by `page.tsx`
  (a Server Component) so the "submissions are closed" notice is in the
  first server-rendered HTML, not only after a failed client submit — the
  same SSR-first rule `CreepMap`'s own sizing already follows (see above).
  `createCreepRouteDraft` resolves the map's document id **deterministically**
  as `creepMap.<slug>` (`scripts/creep-maps/publish.mjs`'s own convention),
  never by querying Sanity for it — **if the chosen map hasn't been
  published yet, the draft still references the id it will have once
  `publish.mjs` runs for that slug**; nothing is lost or blocked, the
  Studio just shows a dangling reference in the meantime, same as any
  reference to a not-yet-existing document. The companion build (if any)
  has no such deterministic id, so it's resolved by a live slug lookup at
  write time; a lookup failure drops just that link, not the submission.
- **`actions.ts`**'s `submitCreepRoute` mirrors `submitBuild` exactly: the
  stops array arrives as a hidden `stopsJson` field (serialised
  client-side, the same trick `BuildSubmitForm` uses for `stepsJson`),
  honeypot (`website`, must stay empty), `startedAt` min-fill-time (8 s),
  a per-IP in-memory throttle (1/minute, per serverless instance),
  `canAcceptSubmissions()`, then `createCreepRouteDraft`. Field errors are
  keyed the same way builds' are, `"stops.2.time"`, `"title"`, etc.
- **`src/lib/creep-routes/exchange.ts`** is the `#route=` deep-link reader,
  `src/lib/builds/exchange.ts`'s `#build=` pattern with a creep-route
  shape (`EXCHANGE_FORMAT = "wc3gym-creep-route"`): a fragment identifier
  never reaches the server or its logs, decoded client-side
  (`decodeFromHash`/`parseExchange`) and used to prefill `RouteSubmitForm`
  on mount — also applied on `hashchange`, so a link followed while the
  editor is already open prefills too, not just a fresh load; a rejected
  payload logs a `console.warn` in development instead of failing silently.
  This is the seam a later feature's overlay/replay importer is
  expected to write to — **nothing writes this export today**, F005 only
  ships the reader, same "cheap, do it now" reasoning as the rest of this
  seam.

## The JSON API

Four public, read-only endpoints, mirroring `/api/builds`'s own shape and
headers exactly (`src/app/api/builds/_headers.ts`, reused by import, not
copied): open CORS (`Access-Control-Allow-Origin: *`, so the desktop
overlay can fetch cross-origin from `file://`/`tauri://`), a 5-minute
shared cache on success (`Cache-Control: public, s-maxage=300,
stale-while-revalidate=600`, 60 s on a 404), and `OPTIONS` support on every
route. A 404 is always `{ "error": "not_found" }`. `src/lib/creep-routes/serialize.ts`
builds every response DTO from the domain types (`types.ts`).

| Endpoint | Returns | Notes |
| --- | --- | --- |
| `GET /api/creep-routes` | `{ routes: ApiRouteListItem[] }` | Approved routes. Optional `race`, `vs`, `map`, `level` query filters, same validation as `/learn/creep-routes`'s own URL params — an invalid value is silently ignored, not an error. |
| `GET /api/creep-routes/<slug>` | `{ route: ApiRoute }` | Adds `description`, the optional companion `build` link, and `derived` (per-stop `heroLevelAfter`/`xpAfter`/`isNight` plus `finalLevel`/`finalXp`, from `derive.mjs`'s `deriveRoute` — a consumer doesn't need to reimplement the XP model). 404 if the slug doesn't exist. |
| `GET /api/creep-maps` | `{ maps: ApiMapListItem[] }` | One row per catalogue; `camps` is a **count**, not the array, to keep the payload small. |
| `GET /api/creep-maps/<slug>` | `{ map: ApiMap }` | The full catalogue: `bounds` (playable rect), `terrainBounds`/`cameraBounds` (reference-only, see "The playable rectangle" above), `image`, `camps[]` (with `creeps[]`), `starts`, `mines`, `shops`, an absolute `minimapUrl`. 404 if the slug doesn't exist. |

**List item** (`ApiRouteListItem`) — a deliberately narrow, explicit field
set, not "everything the domain type has minus `description`": no
`build`, `authorDiscord`, `maintainer`, `sourceUrl` or `patch` either,
since those are detail-only. Every stop carries a `dayClock` string
(computed from `time`, not stored) alongside the real-seconds `time`, so a
consumer never has to import `clock.mjs` itself:

```json
{
  "routes": [
    {
      "slug": "orc-shadow-hunter-last-refuge",
      "title": "Shadow Hunter creep route",
      "race": "orc",
      "vsRaces": ["undead"],
      "level": "standard",
      "map": { "slug": "last-refuge", "name": "Last Refuge", "mapVersion": "1.4" },
      "hero": "or-shadow-hunter",
      "summary": "Shadow Hunter's Healing Wave keeps this cheap: four medium camps on Last Refuge before the push.",
      "author": "Gym coaches",
      "stops": [
        { "campId": "c01", "time": 15, "dayClock": "12:45" },
        { "campId": "c02", "time": 80, "dayClock": "16:00", "condition": "Skip if the Undead scouted this side" }
      ],
      "featured": false,
      "publishedAt": "2026-09-14T10:00:00Z",
      "updatedAt": "2026-09-14T10:00:00Z"
    }
  ]
}
```

`map.mapVersion` here is the **route's own** recorded `mapVersion` (the
catalogue version it was written against, `CreepRoute.mapVersion`), not a
live re-fetch of the map document's current version — cheap, and exactly
what "mark routes whose `mapVersion` differs" (see the runbook below)
needs to compare against.

**Detail** (`ApiRoute`) adds `description`, `build`, and `derived`:

```json
{
  "route": {
    "...": "…all ApiRouteListItem fields…",
    "build": { "slug": "human-fast-expand-archmage-rifles", "title": "Archmage fast expand into Rifles" },
    "derived": {
      "stops": [
        { "heroLevelAfter": 1, "xpAfter": 116, "isNight": false },
        { "heroLevelAfter": 2, "xpAfter": 248, "isNight": false }
      ],
      "finalLevel": 3,
      "finalXp": 541
    }
  }
}
```

**Map list** (`ApiMapListItem`):

```json
{
  "maps": [
    { "slug": "autumn-leaves", "name": "Autumn Leaves v2", "mapVersion": "2.0", "w3cMapId": 44, "image": { "width": 256, "height": 256 }, "camps": 20, "minimapUrl": "https://warcraft3.gym/maps/autumn-leaves.png" }
  ]
}
```

**Map detail** (`ApiMap`) is the entire catalogue — `bounds`,
`terrainBounds`, `cameraBounds`, `image`, `camps[]` (each with its
`creeps[]`), `starts`, `mines`, `shops` — with `minimapUrl` made absolute.
`terrainBounds`/`cameraBounds` are optional on `CreepMap`: fixtures (still
the only source in dev, see "Publishing a map" above) carry them straight
from the generated catalogue, but neither the `creepMap` Sanity schema nor
`publish.mjs` writes them to a published document today, since they were
scoped as reference-only for the map-building pipeline itself, not for
consumers — a Sanity-backed map's API response simply won't have these
two keys until a future feature adds them to the schema and the publish
script, should a consumer turn out to want them.

## When the ladder pool rotates

The W3Champions 1v1 ladder pool changes periodically (a map is swapped
in/out, or gets a new version). When it does:

1. **Get the new `.w3x`/`.w3m` files** for the current pool (see
   `scripts/creep-maps/README.md` for where the launcher bundle's maps
   live; a rotation usually means at least one map isn't in that bundle
   yet and has to be sourced separately).
2. **Run `build.mjs`** for every changed/new map:
   ```
   node scripts/creep-maps/build.mjs <map1.w3x> [<map2.w3x> …] --out src/lib/creep-routes/maps --debug
   ```
   (`--out` now creates the directory if it doesn't exist.) Check the
   stdout summary line per map (camp/start/mine/shop counts, any "dropped
   outside the playable rect") and eyeball the `--debug` overlay PNGs —
   every colored dot should sit on land, not water — before trusting the
   output. Copy the resulting minimap PNGs into `public/maps/`.
3. **Run `creep-table.mjs`** only if the new/changed maps introduce creep
   unit ids the table doesn't already have — `build.mjs` throws, naming
   the unknown id, rather than guessing a level; that's the signal this
   step is needed (see "Map catalogue script" above for what feeds the
   table).
4. **Run `publish.mjs`** for every changed map to push the new catalogue
   (and, if the minimap changed, a new image asset) to Sanity:
   ```
   SANITY_API_WRITE_TOKEN=<editor token> node scripts/creep-maps/publish.mjs <slug1> <slug2>
   ```
   This overwrites any manual camp-position nudge an editor made for that
   map in the Studio — same trade-off "Publishing a map" above already
   describes.
5. **Mark routes whose `mapVersion` differs.** A `creepRoute` document's
   own `mapVersion` field (also in the JSON API's list-item `map.mapVersion`,
   see above) records the catalogue version the route was written
   against. After a rotation, compare it to the republished map's own
   `mapVersion`: a mismatch doesn't mean the route is wrong (camp
   positions and levels rarely change between minor versions), but it's
   the signal a coach should spot-check that route before trusting it
   again. There is no automated check for this today — a manual Studio
   query (`*[_type == "creepRoute" && mapVersion != *[_type == "creepMap"
   && slug.current == ^.map->slug.current][0].mapVersion]`) or a quick
   script over the JSON API (`/api/creep-routes` gives every route's
   `map.mapVersion` and `map.slug` in one call) both work; see the
   Backlog below.

## Backlog

What this mission deliberately left undone, in the order a future
mission would likely want to pick it up:

- **Overlay panel.** The desktop overlay (`apps/overlay`) shows build
  orders today; a creep-route panel driven by `/api/creep-routes` is the
  natural next surface — the JSON API this feature ships is exactly the
  seam it would read from.
- **Replay → route import.** `/api/replay-import` already turns a `.w3g`
  replay into a build-order draft; teaching it to also emit a creep-route
  draft (camps cleared, in order, with real timestamps) would let a coach
  generate a route from their own game instead of authoring one by hand.
- **Merged build+route timeline.** A route's optional `build` link (and a
  build's routes, via `getRoutesForBuild`) exist, but no page shows a
  single interleaved timeline of build steps and camp clears — today
  they're two separate step tables on two separate pages.
- **Current-revision map files.** The fixtures (and, once published, the
  Sanity documents) are built from the 2021–22 launcher bundle's map
  files, not necessarily this ladder season's exact revision — see "When
  the ladder pool rotates" above for the process to catch up; nobody has
  run it yet against a live pool change.
- **`build.mjs` not creating `--out`** — fixed in this feature
  (`mkdirSync(out, { recursive: true })`), listed here only as the record
  of when it was closed.
- **Route page back-link not preserving filters.** Following a route from
  a filtered `/learn/creep-routes?race=human&...` list to its detail page
  and back loses the filters — the back link doesn't carry the query
  string forward.
- **The H1-under-sticky-nav site issue.** A pre-existing, site-wide layout
  bug also seen on the build-order page's hero: on some viewports an `<h1>`
  that wraps to a second line has that line clipped behind the sticky nav
  bar (observed on a route detail page's title, e.g.
  "Archmage standard creep route" — see F003's `user-test.md`). Not
  specific to creep routes and not fixed by this mission.
