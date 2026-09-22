# Map catalogue script

Turns a W3Champions `.w3x`/`.w3m` map into a **map catalogue**: camps (with
their creeps, summed level, xp and difficulty band), start spots, gold
mines, neutral-passive shops, world/terrain bounds and a 256x256 minimap
PNG. Backed by a sourced creep table (`src/lib/creep-routes/creeps.json`) —
the script never guesses a creep's level.

## Getting map files

There is no public host that serves the exact files the W3Champions 1v1
ladder pool uses. Two sources:

1. **Pool list** (names, W3C ids, current version strings, no auth):
   `curl -s https://website-backend.w3champions.com/api/ladder/active-modes`
   — the entry with `"id":1` is "1 vs 1"; its `maps[]` are `{id, name, path}`.
2. **Map files** (older revisions, still useful as fixtures): the W3Champions
   launcher bundle at `https://update-service.w3champions.com/api/maps`
   (redirects to `maps_v27.zip`, ~21 MB). It contains
   `W3Champions/v10/*.w3x` and `W3Champions/v11/*.w3x` from 2021-22,
   including 9 of the 12 current 1v1 pool maps: `AutumnLeaves_v2-0`,
   `EchoIsles`, `NorthernIsles`, `ShallowGrave_v1.4`, `TurtleRock`,
   `TwistedMeadows` (in `v10/`) and `LastRefuge_v1.4`, `Springtime_v1.1`,
   `Tidehunters_v1.2` (in `v11/`).

   Download and unzip it into a **scratch directory outside this repo**,
   never into the repo — the archive and the `.w3x` files are not checked
   in anywhere.

   `Hammerfall`, `Scrimmage` and `Fading Autumn` are not in the bundle. Drop
   their current `.w3x`/`.w3m` files (from the pool list's `path`, downloaded
   however you have a W3Champions client) into a scratch dir and run the
   script on those too; there is nothing map-specific about the "no
   catalogue for them yet" state, they just were not in the one bundle we
   had.

## Running it

```
node scripts/creep-maps/build.mjs <map.w3x> [more.w3x…] --out <dir> [--debug] [--creeps <path>] \
  [--itemdata <itemdata.slk> --itemstrings <itemstrings.txt> --itemfunc <itemfunc.txt>]
```

Writes `<dir>/<slug>.json` and `<dir>/<slug>.png` per map. `--debug` also
writes `<dir>/<slug>.debug.png`: the minimap at 3x with camps (coloured by
band), mines (gold) and starts (blue) drawn on top, for eyeballing that the
world → minimap coordinate mapping lines up. `--creeps <path>` points the
run at an alternate creep table JSON instead of the checked-in
`src/lib/creep-routes/creeps.json`; omitting it uses the checked-in table,
unchanged from before this flag existed.

Every camp always carries `drops` (F011 — see "Item drops" below); passing
all three `--itemdata`/`--itemstrings`/`--itemfunc` flags together also
expands and embeds each drop's `items` (id/name/icon). Omit all three to
build without touching those source files at all — every drop's `items`
then stays `[]` (this is what a plain, single-map smoke build does).

The committed catalogues live in `src/lib/creep-routes/maps/<slug>.json`
with their minimap at `public/maps/<slug>.png` — run the script into a
scratch `--out` dir and copy the two files into place per map; the script
itself does not know about the site's directory layout.

### The playable rectangle

`bounds` (and every normalised `x`/`y`) is the map's **playable
rectangle**, not the raw `war3map.w3e` terrain grid: `war3map.w3i` records
an unplayable border on each side as `complements` (`int[4]`, file order
**left, right, bottom, top**, in 128-unit tiles); `map-info.mjs`'s
`computePlayableBounds(terrainBounds, complements)` subtracts it out. The
minimap image (`war3mapMap.blp`) only ever draws the playable rectangle —
mapping over the full terrain grid instead put every marker roughly 23%
too closer to the map's centre than the real in-game minimap (F001
followup-3, opened from a user report; see
`missions/2026-09-21-creep-routes/features/001c-playable-bounds/spec.md`
for the evidence, and `coff-reference.test.mjs` for the executable proof
against coff-creeps' own reference positions). `terrainBounds` and
`cameraBounds` are both kept in the catalogue JSON for reference only.

A creep/start/mine/shop unit sitting in the unplayable border (decorative)
is dropped, never clamped into `[0, 1]`; `build.mjs`'s stdout summary line
names the count when this happens (`N dropped outside the playable rect`).

Camp ids are ordered by distance-then-angle from the map's **terrain**
centre (not the playable rect's own, often off-centre one) so they stay
stable regardless of how the playable rect happens to sit inside the
terrain grid.

### The minimap letterbox crop

`war3mapMap.blp` is always rendered into a 256x256 square canvas. Non-square
maps (bounds aspect != 1) get uniform black padding bands on their shorter
axis; `build.mjs` detects and crops those bands (`decodeMinimapCropped` in
`minimap.mjs`, backed by the pure `cropLetterbox` in
`src/lib/creep-routes/minimap-crop.mjs`) so the written PNG's aspect matches
`bounds`'s aspect and camps/starts/mines land on the right pixel with no
further client-side adjustment. The catalogue JSON records the post-crop
size as `image: { width, height }`.

The crop is accepted if the cropped image's aspect matches the bounds
aspect within 3%, **or** if it matches the in-game editor's own letterbox
rounding: the editor rounds a letterboxed map's shorter content dimension
*up* to a multiple of 16 pixels (and stretches slightly to fill it) rather
than keeping the exact `256/aspect` fraction, so `expectedHeight =
ceil16(256 / boundsAspect)` (symmetric on width for a tall map) is also
accepted, within 1 row/column for JPEG-ish BLP compression bleed. If
neither check passes, the whole build throws for that map — naming the
map, the bounds aspect and the image aspect — rather than shipping a
misaligned image.

`northern-isles` previously failed the plain 3% check under the old
(terrain-rect) bounds aspect (1.3333 vs. a real letterbox of ~1.2308); under
the playable-rect aspect (1.2558) it's within tolerance outright and now
builds normally. `echo-isles` (playable aspect 1.381) needs the 16-px
rounding rule itself (`ceil16(256/1.381) = 192`, a 3.4% gap from the plain
check) — see this feature's handoff
(`missions/2026-09-21-creep-routes/features/001c-playable-bounds/handoff.md`)
for the full before/after picture; the pixel-level investigation that first
found Northern Isles's real letterbox is in
`missions/2026-09-21-creep-routes/features/001b-slk-table-and-letterbox/handoff.md`.

## What the JSON means

```jsonc
{
  "slug": "autumn-leaves",           // stable across map revisions
  "name": "Autumn Leaves v2",
  "mapVersion": "2.0",               // from the file name; null if absent
  "w3cMapId": 44,                    // from the W3C 1v1 pool list, or null
  "w3cName": "Autumn Leaves v2",
  "sourceFile": "w3c_AutumnLeaves_v2-0.w3x",
  "generatedAt": "2026-09-21T12:00:00.000Z",
  "bounds": { "xMin": -6272, "xMax": 6272, "yMin": -6272, "yMax": 6272 }, // playable rect, world units (terrain minus the w3i "complements" border)
  "terrainBounds": { "xMin": -8192, "xMax": 8192, "yMin": -8192, "yMax": 8192 }, // war3map.w3e terrain grid, reference only
  "cameraBounds": [-5760, -6016, 5760, 6016, -5760, 6016, 5760, -6016],   // war3map.w3i, reference only
  "image": { "width": 256, "height": 256 }, // post-letterbox-crop PNG size; not always 256x256, see below
  "camps": [
    {
      "id": "c01",                  // stable: ordered by distance from map centre, then angle
      "x": 0.5, "y": 0.5,           // normalised 0-1 minimap position
      "worldX": 0, "worldY": 0,     // world units
      "creeps": [{ "id": "nftt", "name": "Forest Troll", "level": 2, "count": 2, "icon": "BTNForestTrollTrapper" }],
      "level": 12,                  // summed creep levels (per-instance, not per distinct type)
      "xp": 480,                    // summed creepXp(level) per creep instance, before hero-level factor
      "band": "medium",              // "easy" <=9, "medium" 10-19, "hard" >=20 (BAND_MAX_LEVEL in camps.mjs; matches Liquipedia's own cutoffs)
      "sleeps": true,               // true only if every creep in the camp sleeps
      "drops": [                    // F011 — see "Item drops" below
        {
          "kind": "class", "class": "Permanent", "level": 2, "chance": 100,
          "items": [{ "id": "clsd", "name": "Cloak of Shadows", "icon": "BTNCloak" }]
        }
      ]
    }
  ],
  "starts": [{ "player": 0, "x": 0.37, "y": 0.79, "worldX": -2176, "worldY": -4672 }],
  "mines": [{ "x": 0.5, "y": 0.5, "worldX": 0, "worldY": 0, "gold": 12500 }],
  "shops": [{ "id": "ntav-3", "x": 0.4, "y": 0.6 }] // neutral-passive buildings, not mines; unknown ids allowed here
}
```

`x`/`y` map world coordinates to the minimap image the same way the PNG is
laid out: `u = (x - xMin) / (xMax - xMin)`, `v = (yMax - y) / (yMax - yMin)`
(image v grows downward, world y grows upward).

## The creep table and its sourcing

`src/lib/creep-routes/creeps.json` maps a creep's 4-character rawcode (e.g.
`nftt`) to `{ name, level, sleeps, source }`. The script refuses to guess:
an unknown rawcode, or an entry missing a name/integer level 1-10/source
URL, makes catalogue building throw, naming the id, instead of silently
shipping a wrong level.

**The table is built entirely from Blizzard's own game data** (patch
1.27.1, enUS), mirrored in the [w3x2lni](https://github.com/sumneko/w3x2lni)
repository, by `scripts/creep-maps/creep-table.mjs`:

```
node scripts/creep-maps/creep-table.mjs \
  --strings <neutralunitstrings.txt> \
  --balance <unitbalance.slk> \
  --data <unitdata.slk> \
  [--ids <path-to-catalogue-dir-or-id-list>] [--all] \
  --out src/lib/creep-routes/creeps.json
```

By default it builds an entry for every rawcode referenced by a catalogue
under `src/lib/creep-routes/maps/*.json`; `--ids <dir>` points at a
different catalogue directory, `--ids <file>` reads an explicit rawcode
list (JSON array or one per line), and `--all` builds every id with a
`Name=` entry in the strings file (every neutral unit, not just ones
current catalogues use). It fails loudly, naming every missing id, if a
requested rawcode has no name, no integer level 1-10, or no `canSleep`
flag in the three source files — same "never guess" rule as the runtime
`getCreep` lookup.

Name comes from
[`neutralunitstrings.txt`](https://raw.githubusercontent.com/sumneko/w3x2lni/master/data/enUS-1.27.1/mpq/Custom_V1/Units/neutralunitstrings.txt)
(`[id]` section, `Name=` field); level from
[`unitbalance.slk`](https://raw.githubusercontent.com/sumneko/w3x2lni/master/data/enUS-1.27.1/mpq/Custom_V1/Units/unitbalance.slk)
(row keyed by `unitBalanceID`, `level` column); `sleeps` from
[`unitdata.slk`](https://raw.githubusercontent.com/sumneko/w3x2lni/master/data/enUS-1.27.1/mpq/Units/unitdata.slk)
(row keyed by `unitID`, `canSleep` column). Both `.slk` files are read with
the small SYLK parser in `src/lib/creep-routes/slk.mjs`. Every entry's
`source` is the `unitbalance.slk` URL above.

This replaces an earlier table built by hand from individual
`warcraft.wiki.gg` pages. A cross-check against the SLK data (done in the
follow-up that added the 11 rawcodes the wiki didn't have pages for) found
2 of 5 spot-checked wiki entries named the *wrong unit* for their rawcode
(`nanb` is "Barbed Arachnathid" level 1, not "Nerubian Webspinner" level 3;
`nfpt` is "Polar Furbolg Tracker" level 6, not "Fel Stalker" level 5).
Regenerating the whole table from `creep-table.mjs` found 26 of 83 entries
(31%) disagreed with the wiki-sourced table on name and/or level — the SLK
data is now the *only* method used; the wiki is, at most, a cross-check.

As of this feature, all 83 rawcodes referenced by the generated catalogues
are SLK-sourced.

## Item drops (F011)

A camp's possible item drops come from two sources in the map file itself,
both parsed and carried through untouched until resolution:

- **`war3mapUnits.doo`** (`units-doo.mjs`) — every placed unit's own
  `droppedItemSets`: `[{ items: [{ itemId, chance }] }]`, one set per
  independent roll the game makes when the unit dies. `itemId` is either a
  concrete 4-char item id (`"ckng"` = Crown of Kings +5) or a random-pool
  pseudo-code.
- **`war3map.w3i`** (`map-info.mjs`'s `parseW3i`) — the map-level
  `randomItemTables` a unit can point at instead, via its own
  `itemTablePointer` (`-1` = none; matched by the table's own `id`, not
  array position). None of the nine bundle maps actually use this — every
  unit's `itemTablePointer` is `-1` — so it's only exercised by a synthetic
  test (`map-info.test.mjs`, `drops.test.mjs`).

**The random-pool pseudo-code** is `"Y" + classLetter + "I" + levelDigit`
(e.g. `"YiI3"` = Permanent level 3); `"Y"` as the class letter itself means
"any class" (`"YYI4"` = any class, level 4):

| Letter | Class (matches `itemdata.slk`'s own `class` column) |
|---|---|
| `i` | `Permanent` |
| `j` | `Charged` |
| `k` | `PowerUp` |
| `l` | `Artifact` |
| `m` | `Purchasable` |
| `n` | `Campaign` |
| `o` | `Miscellaneous` |

`scripts/creep-maps/drops.mjs` (pure, `drops.test.mjs`):

- **`classifyItemId(code)`** decodes one item code per the table above,
  falling back to `{ kind: "item", id: code }` for anything that doesn't
  match (a concrete id).
- **`campDrops(creepUnits, randomItemTables)`** unions every creep unit's
  resolved drop sets (inline + map-level table, when pointed at), deduped
  by `class+level` (a pool) or `id` (a concrete item) — the *highest*
  chance seen wins when more than one creep in the camp carries the same
  pool/item. A set with zero items (a real shape the file can carry)
  contributes nothing.
- **`expandPool(itemdataIndex, cls, level)`** — the real in-game pool for a
  `class`+`level`: every `itemdata.slk` row with that `class`/`Level` and
  `pickRandom === "1"`. Verified against the spec's own fact sheet, straight
  from the SLK: Permanent L1-L6 = 4/5/6/9/9/6 items, Charged L2-L4 =
  4/5/8, Power Up L1-L2 = 4/5, Artifact L7-L8 = 4/3.

`build.mjs` always computes `drops` (raw — `items: []`); passing
`--itemdata`/`--itemstrings`/`--itemfunc` also expands and embeds `items`
(see "What the JSON means" above). `scripts/creep-maps/item-table.mjs`
builds the separate `src/lib/creep-routes/items.json` dictionary (`{ "<id>":
{ name, class, level, icon } }`) — every item id any catalogue's camps'
`drops` actually reference, name from `itemstrings.txt`, icon key from
`itemfunc.txt`'s `Art=` (same `BTN<Name>` shape creeps use):

```
node scripts/creep-maps/item-table.mjs \
  --itemdata <itemdata.slk> --itemstrings <itemstrings.txt> --itemfunc <itemfunc.txt> \
  [--maps <catalogue-dir>] \
  --out src/lib/creep-routes/items.json
```

**Patch caveat**: `itemdata.slk`'s pool sizes are from patch 1.27.1 — a
current Liquipedia page can show a *different* count for the same
class+level (their own fact sheet: "Liquipedia shows 7 for Permanent L3 on
a newer patch"), and a real map's own `droppedItemSets` can carry *more*
pools per creep than an older Liquipedia preview snapshot shows (verified
directly against the real `war3mapUnits.doo` bytes for Autumn Leaves' `c03`/
`c04`/`c12`/`c13` — see `drops.test.mjs`'s cross-check and this feature's
handoff for the full table). Neither is a bug; both are just two different,
independently-sourced snapshots of the same underlying (and occasionally
patched) game data.

## Icons (F011)

`creeps.json` gets an `icon: "BTN<Name>"` per entry from
`neutralunitfunc.txt`'s `Art=` (`creep-table.mjs`'s `--func` flag);
`items.json` gets the same shape from `itemfunc.txt`. Both text files share
one parser, `scripts/creep-maps/txt-sections.mjs`'s `parseIniField` (one
`[rawcode]`-sectioned file, any `Key=` field) and `iconKeyFromArt` (strips
the `ReplaceableTextures\CommandButtons\` path and the `.blp` extension).

`scripts/creep-maps/fetch-icons.mjs` fetches every icon key either table
references from Liquipedia (`File:Wc3<key>.png` on the shared `commons`
wiki — same source and API recipe as F008's `icons.mjs`: descriptive
`User-Agent`, `>=2s` between *every* request including the actual image
download, MediaWiki API only, never an HTML page), downscales each to fit
within 64x64 (`icons.mjs`'s `downscaleIconPng`), and writes
`public/wc3-icons/creeps/<key>.png` / `public/wc3-icons/items/<key>.png`. A
key shared by more than one rawcode/item id is fetched once. Already-present
files are skipped, so an interrupted run is safe to resume:

```
node scripts/creep-maps/fetch-icons.mjs --scratch <scratch-dir-for-originals>
```

Keys Liquipedia doesn't have (never guessed or substituted) are recorded in
`scripts/creep-maps/icons-missing.json` (`{ side, icon }[]`); the UI falls
back to a lettered chip for those.
