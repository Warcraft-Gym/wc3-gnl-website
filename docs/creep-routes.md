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

### The random-unit-table flag (F010, doc-only)

`scripts/creep-maps/units-doo.mjs`'s placed-unit parser reads a trailing
`randomFlag` `int32` per unit: `-1` means "not a random-unit table entry" —
an ordinary, specific unit (every creep in these nine catalogues) — and
consumes no further bytes; `0`/`1`/`2` are the three random-table shapes
(a level-based table, a group/position pick, and an explicit
id/chance list respectively), each consuming a different tail; anything
else throws, naming the unrecognised flag, rather than guessing a layout
and silently misreading the rest of the file (verified against
`war3mapUnits.doo`'s full byte length in `units-doo.test.mjs` — see C-011).
This was already handled correctly in code; F010's review pass found it
undocumented at the doc-file level (gaps.md #6) and added this note.

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

### Camp difficulty bands (F008)

`scripts/creep-maps/camps.mjs`'s `BAND_MAX_LEVEL` (`{ easy: 9, medium: 19
}`, hard above) sorts a camp's summed creep level into `easy`/`medium`/
`hard` — see "Data model" below for where `band` lands on `MapCamp`. These
cutoffs match Liquipedia's own "Easy/Medium/Hard Creep Spot [N]" labels (N
= summed creep level, the same basis as `level` here), read from six of
their map previews via the MediaWiki API (`action=parse&page=<Map>/Preview`,
a descriptive User-Agent, polite delays): Hillsbrad Creek, Autumn Leaves,
Echo Isles, Last Refuge, Turtle Rock, Twisted Meadows — easy 5-9, medium
10-19, hard 20-26. A prior feature had derived its own cutoffs (easy <=9,
medium <=15) from this repo's own percentile distribution; F008 replaced
the medium/hard line (15 -> 19) to match Liquipedia's instead, on the
theory that matching a resource players already read beats a marginally
different percentile split of our own. Regenerating a catalogue after a
`BAND_MAX_LEVEL` change only touches each camp's `band` field (and
`generatedAt`) — camp positions, levels and creep contents are untouched,
verified with `cmp` against the previously-committed minimap PNGs (which
`build.mjs` also rewrites unconditionally; they come out byte-identical
because bands never feed minimap rendering). Across the nine catalogues'
183 camps: 55 easy, 102 medium, 26 hard.

### Map icons (F008)

Gold mines and neutral buildings (taverns, goblin merchants, mercenary
camps…) draw with Liquipedia's own icons, matching the marker colours
above. The originals are Blizzard art, hosted on Liquipedia — CC-BY-SA
covers Liquipedia's own text, not this art. The site's UI carries no
"Map icons via Liquipedia" credit (F009-followup-2 removed it from
`MapLegend.tsx` on the route page and the editor, at the user's request);
the source URLs and attribution below are the sole record of where each
icon came from.

**Fetch recipe** — Liquipedia's HTML pages are Cloudflare-blocked to a
scripted fetch; the MediaWiki API is not. Two calls, both against the
shared media repo (`liquipedia.net/commons/api.php`, not the per-game
wiki — these icons live in Liquipedia's shared "lpcommons" repository, not
the `warcraft` wiki's own `allimages`), a descriptive `User-Agent`, `--compressed`
(the API 406s a request with no `Accept-Encoding: gzip`), and >= 2s between
calls:

```
GET https://liquipedia.net/commons/api.php?action=query&list=allimages&aiprefix=Wc3_&ailimit=500&format=json
  -> every Wc3_*.png/.jpg filename and its page id

GET https://liquipedia.net/commons/api.php?action=query&titles=File:<name>|File:<name2>|...
    &prop=imageinfo&iiprop=url|size&format=json
  -> each file's real download URL (liquipedia.net/commons/images/<a>/<ab>/<name>)
```

Then a plain `GET` of each `imageinfo.url` (same UA, same delay) downloads
the original.

**Every icon file and its source**, all under `public/map-icons/<name>.png`,
downscaled from the Liquipedia original to fit within 64x64 (aspect kept —
`scripts/creep-maps/icons.mjs`'s `fitDimensions`; a mine's 256x211 original
becomes exactly 64x53) with a small dependency-free PNG decoder/box-resizer
in that same module (no `sharp` in the lockfile, same constraint
`minimap.mjs`'s own encoder documents) built on `node:zlib` and
`minimap.mjs`'s existing `encodePng`:

| File | rawcode(s) | Source (`File:` page) |
|---|---|---|
| `gold-mine.png` | `ngol` (`map.mines[]`, its own array — not resolved via `NEUTRAL_ICONS`) | `https://liquipedia.net/commons/File:Wc3_goldmine.png` |
| `tavern.png` | `ntav` | `https://liquipedia.net/commons/File:Wc3_tavern.png` |
| `goblin-merchant.png` | `ngme` | `https://liquipedia.net/commons/File:Wc3_merchant.png` |
| `mercenary-camp.png` | `nmer`, `nmr0`, `nmr2`-`nmr9`, `nmra`-`nmrf` (tileset variants; `nmr1` is not a real unit) | `https://liquipedia.net/commons/File:Wc3_merccamp.png` |
| `goblin-laboratory.png` | `ngad` | `https://liquipedia.net/commons/File:Wc3_laboratory.png` |
| `marketplace.png` | `nmrk` | `https://liquipedia.net/commons/File:Wc3_marketplace.png` |
| `fountain-of-health.png` | `nfoh` | `https://liquipedia.net/commons/File:Wc3_fountainhealth.png` |
| `fountain-of-mana.png` | `nmoo` | `https://liquipedia.net/commons/File:Wc3_fountainmana.png` |
| `goblin-shipyard.png` | `nshp` | `https://liquipedia.net/commons/File:Wc3_shipyard.png` |

The first five came from the evidence gathered ahead of this feature
(`Hillsbrad_Creek/Preview`'s own images); `marketplace`/`fountain-of-health`/
`fountain-of-mana`/`goblin-shipyard` were found via the `allimages` call
above and fetched the same way. Two rawcodes the spec flagged as possible
extras — Dragon Roost (`ndrr`/`ndrg`/…) and Way Gate (`nwgt`) — have no
matching file under Liquipedia's `Wc3_` prefix (checked: no `*roost*`,
`*gate*` or `*dragon*` match besides an unrelated map-preview image); they
are not in any of the nine catalogues' shops either, so `NEUTRAL_ICONS`
(below) simply has no entry for them — a future catalogue that needs one
gets a clear "no icon" signal (nothing drawn, the rawcode named in
`build.mjs`'s stdout) rather than a guess.

**Rawcode -> icon** is `src/lib/creep-routes/neutral-icons.ts`'s
`NEUTRAL_ICONS` map (backed by `neutral-icons.mjs`, same split as
`submission.mjs`/`.ts`): `CreepMap`'s `NeutralMarker` looks up a shop's
rawcode (`MapShop.id`'s first four characters — every WC3 rawcode is
exactly four) and renders nothing for a rawcode with no entry — most
neutral-passive units on a map are decorative critters and huts (rats,
sheep, gnoll huts…), not real shops, and inventing an icon for one would
misrepresent the map. Names are Blizzard's own
(`neutralunitstrings.txt`'s `Name=` field, the same source
`creep-table.mjs` uses for creeps), not transcribed from the wiki — F001's
creep-table rebuild found the wiki unreliable for two of five
spot-checked entries.

## Data model

`src/lib/creep-routes/types.ts` defines the domain types the site and the
data layer share:

- **`CreepMap`** — the catalogue shape (`slug`, `name`, `mapVersion`,
  `w3cMapId`, `bounds`, optional `terrainBounds`/`cameraBounds`
  (reference-only, see "The playable rectangle" above), `image`, `camps[]`,
  `starts[]`, `mines[]`, `shops[]`) plus `minimapUrl`: `/maps/<slug>.png`
  for fixtures, the Sanity image asset URL once a map is published. A
  `MapCamp`'s `level`/`xp`/`band` are the camp's own totals (sum of its
  creeps' levels/base xp, and a difficulty label) — not a hero's; see "XP
  model" below for how a hero's own level/xp are derived per stop.
  `terrainBounds`/`cameraBounds` reach a *published* map document as of
  F010: `creepMap.ts`'s schema has the two fields (collapsed, "reference
  only — generated"), `publish.mjs`'s document builder (`buildCreepMapDoc`,
  `src/lib/creep-routes/publish-doc.mjs`, unit-tested — see
  `publish-doc.test.mjs`) writes them, and `MAP_PROJECTION` in `maps.ts`
  projects them — before F010 they existed in every catalogue and every
  fixture but silently never made it past `publish.mjs`, so a Sanity-backed
  map's API response was missing both keys.
- **`CreepRoute`** — `slug`, `title`, `race`, `vsRaces[]` (empty = any),
  `level` (`"standard"` or `"beginner"` — the UI word for this field is
  "Difficulty" as of F009, see "Difficulty naming" below; the field itself
  is unrenamed), `map: { slug, name }`, an optional `start` (an index into
  `map.starts` — which spawn is *your* base; unset means 0, fine for every
  two-start map, only Turtle Rock and Twisted Meadows' four-start layouts
  ever need it set to something else), an optional `hero` (icon key into
  `GAME_ICON_OPTIONS`), `summary`, `author` and credit fields, an optional
  `build` link to a companion `buildOrder`, `patch`, `mapVersion` (the
  catalogue version the route was written against), an optional `tags[]`
  (shown as chips, exactly like builds; F009 added the type and display
  code, F010 wires up persistence — `creepRoute.ts`'s schema has a `tags`
  field, `toCreepRouteDraft` writes `valid.tags`, both Sanity projections
  read `coalesce(tags, [])`, and the JSON API's list DTO includes it — a
  submitted route's tags used to be collected by the form, validated by the
  schema, and then silently discarded: no schema field existed to hold
  them),
  `featured`, `publishedAt`, `updatedAt`, `stops[]`, and an optional
  `description`. A route is always drawn from *your* base: `start` says
  which of `map.starts` that is, the opponent's is just whichever other one
  is left — the map never labels the two "P0"/"P1", see `CreepMap`'s
  `StartMarker` in `DESIGN.md`.
- **`RouteStop`** — `campId: string | null`, and optionally `action` (for a
  `campId: null` base action like `"TP home"`, buying from a shop, or
  taking an expansion), `units` (what the *player* brings to the stop —
  never the camp's contents, which are always looked up from the map by
  `campId`), `note`, `condition`. No time dimension: a route is an ordered
  list of stops, nothing more (F007 removed the per-stop clock and the
  day/night cycle it drove — see the user decision at the top of that
  feature's spec).

`src/lib/creep-routes/fixtures.ts` (backed by the plain-JS
`fixtures.mjs`, so `node --test` can check it directly — see
`fixtures.test.mjs`) ships `FIXTURE_MAPS` (one per generated catalogue) and
five seed `FIXTURE_ROUTES` covering every race, at least two maps (three on
Autumn Leaves), a beginner route, a route with `vsRaces` set, a stop with a
`condition`, a non-camp stop (`campId: null, action: "TP home"`), and (F009)
two routes carrying `tags`.

### Camp label rule (F009)

`src/lib/creep-routes/camp-label.mjs` (tested directly,
`camp-label.test.mjs`) turns a `MapCamp` into reader-facing text — a camp id
like `"c09"` means nothing on its own:

- **`campLabel(camp)`** — `"<highest-level creep's name>"`, plus `" +N"`
  when the camp has more creeps than that one (`N` counts bodies past the
  first, so three copies of the same creep still read `"+2"`). A level tie
  keeps the *first* creep in the camp's own `creeps[]` order — the data's
  own placement order, never re-sorted, never alphabetical. Worked example
  (Autumn Leaves' `c09`: Giant Skeleton Warrior L3, Sludge Flinger L3,
  Skeleton Archer L1): `"Giant Skeleton Warrior +2"`.
- **`campComposition(camp)`** — every creep, `"<count>× <name>"`, joined by
  `" · "`, in the data's own order: `"1× Giant Skeleton Warrior · 1× Sludge
  Flinger · 1× Skeleton Archer"`.

Every reader-facing surface calls one or both: the route page's step table
(label + "Lv N" on one line, composition muted underneath), the map's hover
panel title, the editor's stop rows, the map's `aria-live` readout, and the
route page's `HowTo` JSON-LD step names. A camp id itself is never fully
gone — it stays in `data-camp` attributes and in marker `aria-label`s (both
tooling, read by tests and assistive tech, not by a reader scanning the
page) — only visible copy is required to go through these two functions.

### Difficulty naming (F009)

The UI word for `CreepRoute.level` is **"Difficulty"** everywhere a reader
sees it (the list filter, the route's badge, the editor's field) — the
field itself keeps its name and its two values, `"standard"`/`"beginner"`,
in the API, the Sanity schema and `RouteLevel`. Wherever the two-tier scale
needs explaining (the editor's hint under the Difficulty buttons, and the
list filter's `title` attribute), the copy is the same sentence: "Standard
is the current meta route; Beginner is the safer, simpler one." This is a
deliberately different scale from a build order's own `difficulty`
(beginner/intermediate/advanced) — see `DESIGN.md`'s "Difficulty
vocabulary" bullet for why `RouteFilters` stays a sibling of
`MatchupPicker` rather than a shared component.

## XP model

A creep route has no time dimension (F007, user decision — see that
feature's spec: "the timings are not important and can be removed"): a
route is an ordered list of camp stops and base actions, nothing more. What
*is* derived, and stays load-bearing, is the hero's running level/xp —
`src/lib/creep-routes/derive.mjs`'s `deriveRoute(route, map, { startLevel })`
runs a hero through a route's stops **in order**, folding camp stops
through `xp.mjs`'s per-kill math (skipping non-camp stops).

`src/lib/creep-routes/xp.mjs`'s `creepXp`/`heroXpForLevel`/`creepXpFactor`
are sourced from Blizzard's own `MiscGame.txt` (patch 1.27.1: `NeedHeroXP`,
`GrantNormalXP`, `HeroFactorXP`), cross-checked against
https://warcraft.wiki.gg/wiki/Hero_(Warcraft_III)#Experience — a hero
killing a creep gains XP tapered by `creepXpFactor(heroLevel)`, how far past
the creep's own level the hero has already climbed.

**The reduction factor applies per kill, not once per camp.** An earlier
version of this calculator (through F006) fixed the factor to the hero's
level at the *start* of a camp and applied it to every creep in that camp —
plausible, but wrong: Blizzard's `HeroFactorXP` is read fresh at the moment
of each individual kill, so a hero that levels up mid-camp pays the new,
lower factor for the rest of that camp's kills. `heroLevelAfter` (`xp.mjs`)
and `deriveRoute` (`derive.mjs`) both re-read `creepXpFactor(level)` inside
the innermost per-creep loop, not once before it. Worked example, camps
`[3,3,2]` then `[4,4,3]` (creep levels) from hero level 1:

```
camp 1: 60·0.8=48, 60·0.8=48, 40·0.8=32           -> xp 128 (still L1)
camp 2: 85·0.8=68 -> 196 (L1); 85·0.8=68 -> 264 (crosses to L2 mid-camp);
        60·0.7=42 (now the L2 factor, not 0.8)    -> xp 306 (L2)
```

(A per-camp-fixed factor would have given camp 2's third kill `60·0.8=48`
too, landing on 312 instead of 306 — the bug this fix closes.)

The wiki's table gives the factor as a fraction (e.g. 0.5 at hero level 4),
so `creepXp(level) * factor` is not always a whole number — a level-4 creep
grants a level-4 hero `85 * 0.5 = 42.5` xp by the raw formula. Warcraft III
itself only ever awards whole XP in-game, so **we floor each creep's XP
grant** (`Math.floor(creepXp(level) * factor)`, not the running total)
before adding it to the hero's total, at the point of that same grant. This
is our modelling choice, not something the wiki states explicitly; flooring
per creep (rather than flooring the camp or route total) keeps the total
deterministic regardless of how creeps are grouped or ordered within a
camp.

**One hero, not the whole team.** Blizzard's `GlobalExperience=1` setting
(the ladder default) splits a creep kill's XP evenly across *every* hero
the killing player currently has alive, not just the one that lands the
kill — a two-hero player earns half as much xp per hero as a one-hero
player creeping the same camp. This calculator models a single hero (the
same simplification coff-creeps' route calculator makes) and does not
discount for a second/third hero; a heroes-count toggle that divides the
per-kill grant accordingly is backlog, not shipped.

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

**Studio review ergonomics (F010).** A reviewing coach sees only a bare
camp id ("c09") per stop in the Studio — `campLabel` (F009's human-readable
label, "Giant Skeleton Warrior +2") needs the camp's own map data to
resolve, which isn't available inside a Sanity preview `prepare()` function
without an extra dereferencing fetch this schema doesn't do; the stop
array-member preview stays `"Camp <campId>"` / a note subtitle rather than
attempting one. Both the `map` reference field and the `stops` array field
carry a `description` pointing a coach at
`/learn/creep-routes/submit?map=<slug>` on the site, where camp ids *are*
visible on a real map (`FieldGroupDefinition` has no `description` of its
own in this Sanity version — the `stops` field's description is the
closest available approximation of a "group note", since it's the group's
one real field). A camp thumbnail rendered directly inside the Studio
preview stays backlog (gaps.md #2; see "Backlog" below).

`src/lib/creep-routes/routes.ts` and `maps.ts` mirror
`src/lib/builds/builds.ts`: Sanity first when configured
(`coalesce(reviewStatus, "approved") == "approved"`, `map->{...}`
dereferenced, 300 s ISR revalidate), the bundled fixtures in development
when Sanity is unreachable or empty, and `[]` in production without Sanity.
A Sanity stop's fields (`campId`, `action`, `units`, `note`, `condition`)
are already the domain shape — no per-stop time to convert (F007). A route
whose `map` reference doesn't
resolve (deleted, or — like every catalogue today, none of the nine
`creepMap` documents have been published to Sanity yet, see "Publishing a
map" below — never published) is **dropped from the list** rather than
shown broken (`dropUnresolvedMaps`, `routes.ts` — server-only, no direct
unit test, accepted gap: gaps.md #5), with a `console.warn` in development.

**Production logging gap.** Every Sanity-fetch failure in `maps.ts`/
`routes.ts` (`console.warn(...)`, five call sites) is gated behind
`process.env.NODE_ENV !== "production"` — mirrors `builds.ts`'s existing
pattern exactly, so this is pre-existing style, not something F010
introduced, but it means a genuine Sanity outage in production degrades
silently to fixtures/`[]` with zero observability. Routing these through a
real logger/error-tracker that fires in production too is backlog (see
"Backlog" below).

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
(`creepMap.<slug>`), so re-running is safe. The document itself is built by
`buildCreepMapDoc(slug, catalogue, minimapAssetId)`
(`src/lib/creep-routes/publish-doc.mjs`) — a pure function with no network
call, factored out so it's directly unit-tested (`publish-doc.test.mjs`,
F010) without mocking Sanity; `publish.mjs` itself just uploads the asset
and calls it:

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
with "Clear filters" and "Be the first to add one" (F010: this link now
carries the active `map`/`race`/`vs`/`level` filters into the editor —
"no routes for this matchup yet" leads straight into authoring one for it,
see the editor's own `?map=&race=&vs=&level=` prefill under "Submission"
below — rather than the plain, unfiltered `/learn/creep-routes/submit`).
Both list and detail pages are gated by `CREEP_ROUTES_LIVE` in
`src/lib/flags.ts`.

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

**`RouteListUrlRecorder` (F010).** A tiny always-`null` client component,
mounted alongside `RouteFilters`, that records the list's current URL
(with whatever filters are active) to `sessionStorage` on every change —
what `RouteBackLink` (below) reads to send a visitor back to the exact
filtered view they came from. The gap this closes (gaps.md #4) — a route
page's "All creep routes" link always returning to the *unfiltered* list —
sounds like a `document.referrer` problem, and F010's own spec named
`document.referrer` as the mechanism; it isn't reliable here in practice:
verified with Playwright that clicking a `next/link` from the list to a
route page is a client-side transition (`history.pushState`), and a
browser only ever sets `document.referrer` on an *actual* navigation (a
full page load) — it stayed empty across every such click in testing, so a
`document.referrer`-only implementation would silently never fire for the
one interaction this feature is meant to fix. `RouteBackLink` reads
`sessionStorage` first and only falls back to `document.referrer` (still
useful for a hard navigation — an external link, a fresh tab landing
straight on the list before going to a route) if nothing is stored.

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
header with the matchup, `RouteBackLink` ("All creep routes", F010 — see
above; a plain `next/link` before this feature, now filter-preserving),
the route's difficulty badge ("Standard"/"Beginner" —
see "Difficulty naming" above), map name and `· map v<mapVersion>`,
author/maintainer/updated/source, tags (`TagChip`, F009, persisted as of
F010 — shown when `route.tags` is non-empty), `HowTo` + `BreadcrumbList`
JSON-LD (`src/lib/seo.ts` — step names use `campLabel`, not the raw camp
id), a companion-build card when `route.build` is set, a Discord discussion
link and up to three related routes (same map or same race). The
companion build itself, as of F010, links back: `/learn/builds/<slug>`
shows a "Creep routes for this build" card (`getRoutesForBuild`, reused
`RouteRow`) whenever at least one approved route references it — this data
existed since an earlier feature but no page ever rendered it (gaps.md
#1). Wiring it up surfaced a real fallback gap in `getRoutesForBuild`
itself, fixed alongside: unlike `getCreepRoutes`/`getBuildBySlug`, it used
to return Sanity's result unconditionally whenever Sanity was configured —
even an *empty* one — never falling through to the fixture pairing the way
its siblings do. In an environment with real Sanity build orders but zero
published `creepRoute` documents (this repo's own dev setup today, see
"Publishing a map" above), that meant the card could never appear at all,
for any build, fixture-paired or not; found via this feature's own browser
verification, not assumed from the spec.

The map and the step table are the page's core: `CreepMapPlayground.tsx`
(a client island next to the page) lifts one piece of state, the active
stop index, so `CreepMap` (`src/components/creep-routes/CreepMap.tsx`) and
`RouteStepTable` (`RouteStepTable.tsx`) stay in sync when you hover, focus
or click a stop row (or a marker). `CreepMap` always renders its `<svg>` —
sized by CSS (`viewBox` + `w-full h-auto`), not gated behind a client-only
`ResizeObserver` — so the map's camps, path and stop badges are present in
the server-rendered HTML a curl or a crawler sees, not only after
hydration; the `ResizeObserver` still runs, but only to place the
hover/focus `CampDetails` panel in real pixels. See `DESIGN.md`'s "Creep
routes" section for the camp band colours and mark shapes this page and
its components follow.

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

- **URL prefill (F010).** `?map=<slug>&race=<id>&vs=<id>&level=<id>`
  preselects the setup row — `map` already worked (an earlier feature); F010
  added `race`/`vs`/`level`, each validated against the known ids in
  `page.tsx` (silently ignored if unrecognised, same rule the list page's
  own URL params follow) before being passed to `RouteSubmitForm` as
  `defaultRace`/`defaultVsRaces`/`defaultLevel` (plain `useState` initial
  values — no effect needed, the form only reads them once on mount). This
  is what makes "author a route for this matchup" a shareable link — the
  list page's empty state now uses it (see "Pages" above), and it's the
  seam a future "add the missing route" prompt elsewhere could reuse.
- **`RouteSubmitForm` → `RouteSetup` + `RouteEditor` (`CreepMap` in edit
  mode + `StopEditor` → `StopRow`)** is the component tree, split so no
  file runs long: `RouteSetup` is the map/race/opponent(s)/level/hero/
  companion-build row, `RouteEditor` is a thin layout wrapper (map left,
  `StopEditor` right), `StopEditor` owns the stop list's mutations (add a
  camp stop, add a base action, reorder, remove) and the live `deriveRoute`
  readout, `StopRow` is one stop.
- **The "Your spawn" picker.** `RouteEditor` renders a small radio picker
  under the map, but only when `map.starts.length > 2` (Turtle Rock,
  Twisted Meadows) — every other map's two starts leave nothing to pick
  once you've chosen a race. Picking an option sets `start`, an index into
  `map.starts`, and `CreepMap`'s red "you" X moves to match immediately;
  switching maps resets `start` to 0.
- **A camp is on the route at most once via the click path** — `RouteSubmitForm`'s
  `onCampSelect` toggles: adds a stop if the camp isn't on the route yet,
  removes the existing one if it is; a prefilled/imported route with a
  repeated `campId` (older data, the schema allows it) is still accepted
  as-is, only the click path enforces the rule.
- **`src/lib/creep-routes/submission.mjs` + `submission.ts`.** Same split
  as `fixtures.mjs`/`fixtures.ts`: the `.mjs` file is the pure, plain-JS
  implementation `submission.test.mjs` checks directly with `node --test`
  (no loader, no cross-module TS import — see the file's own header
  comment for why), the `.ts` file is a typed façade the rest of the app
  imports (TS's untyped-JS inference on the raw `.mjs` exports is too loose
  to use as-is — it infers e.g. `vsRaces: never[]` — so every export is
  re-typed on the way out). `createSubmissionSchema({ maps, iconKeys,
  buildSlugs })` builds the zod schema against a **live catalogue** passed
  in by the caller — every map's slug, real camp ids (a stop's `campId`
  is checked against the *chosen* map's own camps in a `superRefine`,
  never a global camp-id set) and optionally its `starts.length`, every
  valid `GAME_ICON_OPTIONS` key, and known build slugs for the optional
  companion link. The route-level `start` field (an index into the chosen
  map's `starts`, defaulting to unset/0) is checked the same way: a
  `superRefine` rejects `start >= starts.length` for the chosen map, but
  only when the caller passed `startsCount` for it — a caller that omits it
  (e.g. a test that doesn't care) skips the bound check rather than failing
  closed. A `campId: null` stop requires `action`; no stop carries a time
  field (F007).
  `toCreepRouteDraft(valid, mapDocId, buildDocId?)` is pure and
  synchronous — no Sanity client — so it's directly testable; the caller
  resolves both ids, and (F010) it now also writes `valid.tags` onto the
  draft — it used to be collected and validated by the schema and then
  simply never read here, so a submitter's tags were silently discarded
  before ever reaching Sanity.
  Two more pure exports live here (F010, same "test the decision, not the
  framework glue" reasoning): `stopsJsonTooLarge(raw)` — `MAX_STOPS_JSON_BYTES`
  (64 KB) checked via `Buffer.byteLength`, called by `actions.ts` *before*
  `JSON.parse`, so an oversized `stopsJson` form value is rejected before a
  full parse is even attempted, not after (the `stops.max(30)` bound only
  ever applied post-parse); and `decideSubmission(data, { now,
  minFillSeconds })` — the honeypot/fill-time decision as a pure function,
  see below.
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
  client-side, the same trick `BuildSubmitForm` uses for `stepsJson`,
  size-capped via `stopsJsonTooLarge` before it's parsed), honeypot
  (`website`), `startedAt` min-fill-time (8 s), a per-IP in-memory throttle
  (1/minute, per serverless instance), `canAcceptSubmissions()`, then
  `createCreepRouteDraft`. Field errors are keyed the same way builds' are,
  `"stops.2.action"`, `"title"`, etc.
  **Honeypot, reachable (F010).** The schema used to reject any nonempty
  `website` itself (`z.string().max(0)`) — every real honeypot hit therefore
  failed schema parsing first, well before the `if (data.website) return {
  status: "ok", slug: "" }` line below it could ever run: dead code,
  surfacing a generic "fix the highlighted fields" error rather than the
  intended silent success (code-a.md, "Should fix" — it also tips off a
  bot that something rejected it, the opposite of a honeypot's point). The
  schema now accepts any string for `website`; the actual decision moved to
  `submission.mjs`'s `decideSubmission(data, { minFillSeconds })`, a pure
  function `actions.ts` calls right after a successful parse: a filled
  honeypot returns `{ action: "fake-ok" }` (the caller returns the silent
  `{ status: "ok", slug: "" }` immediately — `createCreepRouteDraft` is
  never imported into that code path, let alone called), a too-fast
  `startedAt` returns `{ action: "reject", reason: "too-fast" }`, anything
  else `{ action: "proceed" }`. `submission.test.mjs` checks all three
  branches directly, plus that the honeypot check wins when both trip at
  once.
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
builds every response DTO from the domain types (`types.ts`) — as of F010
it's a typed façade over `serialize.mjs`'s pure implementation (same split
as `submission.mjs`/`.ts`: `gameIconSrc` and `deriveRoute` are injected
parameters in the `.mjs` file rather than direct imports, since a plain
`node --test` run can't resolve the `.ts` modules they live in without a
bundler), so the DTO shapes are directly unit-tested — `serialize.test.mjs`
— which found no bugs but did catch that `ApiRouteListItem` was missing
`tags` entirely (added alongside the tags-persistence fix above). The list
API's own query-param validation (`?race=`/`?vs=`/`?map=`/`?level=`, an
invalid value silently dropped) is likewise a pure, unit-tested helper,
`parseRouteQuery` (`query.mjs`/`.ts`, `query.test.mjs`) — `/api/creep-routes`'s
route handler calls it instead of validating inline. `filterCreepRoutes`
itself made the same move to `filter.mjs`/`.ts` (`filter.test.mjs` covers
race/vsRace — including the "any opponent" semantics — map, level and `q`,
alone and combined); `routes.ts` re-exports it so no caller's import path
changed. `derive.mjs` gained a typed façade too, `derive.ts` — `serialize.ts`
now imports `deriveRoute` from there instead of casting the raw `.mjs`
call's return value inline, the one thing `serialize.ts` used to carry an
undocumented `as {...}` for.

| Endpoint | Returns | Notes |
| --- | --- | --- |
| `GET /api/creep-routes` | `{ routes: ApiRouteListItem[] }` | Approved routes. Optional `race`, `vs`, `map`, `level` query filters, same validation as `/learn/creep-routes`'s own URL params — an invalid value is silently ignored, not an error. |
| `GET /api/creep-routes/<slug>` | `{ route: ApiRoute }` | Adds `description`, the optional companion `build` link, and `derived` (per-stop `heroLevelAfter`/`xpAfter` plus `finalLevel`/`finalXp`, from `derive.mjs`'s `deriveRoute` — a consumer doesn't need to reimplement the XP model). 404 if the slug doesn't exist. |
| `GET /api/creep-maps` | `{ maps: ApiMapListItem[] }` | One row per catalogue; `camps` is a **count**, not the array, to keep the payload small. |
| `GET /api/creep-maps/<slug>` | `{ map: ApiMap }` | The full catalogue: `bounds` (playable rect), `terrainBounds`/`cameraBounds` (reference-only, see "The playable rectangle" above), `image`, `camps[]` (with `creeps[]`), `starts`, `mines`, `shops`, an absolute `minimapUrl`. 404 if the slug doesn't exist. |

**List item** (`ApiRouteListItem`) — a deliberately narrow, explicit field
set, not "everything the domain type has minus `description`": no
`build`, `authorDiscord`, `maintainer`, `sourceUrl` or `patch` either,
since those are detail-only. `start` (an index into `map.starts` — which
spawn is the route author's own base) is included but omitted from the
JSON entirely when unset, the same as any other optional field with no
value; JSON's own `undefined`-key-dropping does that for free. `tags`
(F010) is always present, `[]` when the route has none. A stop has
no time field (F007) — just `campId`, `action`, `units`, `note`,
`condition`, in route order:

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
      "tags": [],
      "stops": [
        { "campId": "c01" },
        { "campId": "c02", "condition": "Skip if the Undead scouted this side" }
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
        { "heroLevelAfter": 1, "xpAfter": 116 },
        { "heroLevelAfter": 2, "xpAfter": 248 }
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
`terrainBounds`/`cameraBounds` are optional on `CreepMap` (still reference
only — no coordinate math on the site uses them, see "The playable
rectangle" above), but as of F010 both reach a *published* document too:
the `creepMap` Sanity schema has the fields, `publish.mjs` writes them
(`buildCreepMapDoc`, unit-tested), and `MAP_PROJECTION` projects them —
they were carried by every catalogue and fixture from the start, but
previously never made it past `publish.mjs` into a Sanity-backed map's API
response.

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
  draft (camps cleared, in order) would let a coach generate a route from
  their own game instead of authoring one by hand.
- **Merged build+route view.** A route's optional `build` link, and (as of
  F010) a build's own routes card on `/learn/builds/[slug]`, both link the
  two together, but no page shows their two step tables *combined* into one
  reading experience — they're still two separate pages, just cross-linked
  now.
- **Studio camp preview.** A reviewing coach sees a bare camp id per stop in
  the Studio, with only a text hint pointing them at the live editor to
  cross-reference it (F010, "Studio review ergonomics" above); a real map
  thumbnail rendered inside the Studio's own preview is the follow-up
  (gaps.md #2).
- **Production Sanity-fetch logging.** `maps.ts`/`routes.ts` only
  `console.warn` on a Sanity fetch failure in development (mirrors
  `builds.ts`'s existing pattern) — a genuine outage in production degrades
  silently to fixtures/`[]` with zero observability; routing these through a
  real logger/error-tracker that fires in production too is the follow-up
  (F010, "Review flow" above).
- **Item drop tables per camp.** Liquipedia's map previews list each
  camp's item drop table (from the map's own item tables); our
  `units-doo.mjs` parser already reads `droppedItemSets` off the placed
  units, but nothing surfaces it yet — a natural follow-up to F008, which
  only brought over the colours/bands/icons.
- **Current-revision map files.** The fixtures (and, once published, the
  Sanity documents) are built from the 2021–22 launcher bundle's map
  files, not necessarily this ladder season's exact revision — see "When
  the ladder pool rotates" above for the process to catch up; nobody has
  run it yet against a live pool change.
- **`build.mjs` not creating `--out`** — fixed in this feature
  (`mkdirSync(out, { recursive: true })`), listed here only as the record
  of when it was closed.
- **Route page back-link not preserving filters** — fixed in F010
  (`RouteBackLink` + `RouteListUrlRecorder`, "Pages" above), listed here
  only as the record of when it was closed.
- **The H1-under-sticky-nav site issue.** A pre-existing, site-wide layout
  bug also seen on the build-order page's hero: on some viewports an `<h1>`
  that wraps to a second line has that line clipped behind the sticky nav
  bar (observed on a route detail page's title, e.g.
  "Archmage standard creep route" — see F003's `user-test.md`). Not
  specific to creep routes and not fixed by this mission.
