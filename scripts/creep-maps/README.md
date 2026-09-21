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
node scripts/creep-maps/build.mjs <map.w3x> [more.w3x…] --out <dir> [--debug] [--creeps <path>]
```

Writes `<dir>/<slug>.json` and `<dir>/<slug>.png` per map. `--debug` also
writes `<dir>/<slug>.debug.png`: the minimap at 3x with camps (coloured by
band), mines (gold) and starts (blue) drawn on top, for eyeballing that the
world → minimap coordinate mapping lines up. `--creeps <path>` points the
run at an alternate creep table JSON instead of the checked-in
`src/lib/creep-routes/creeps.json`; omitting it uses the checked-in table,
unchanged from before this flag existed.

The committed catalogues live in `src/lib/creep-routes/maps/<slug>.json`
with their minimap at `public/maps/<slug>.png` — run the script into a
scratch `--out` dir and copy the two files into place per map; the script
itself does not know about the site's directory layout.

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
  "bounds": { "xMin": -8192, "xMax": 8192, "yMin": -8192, "yMax": 8192 }, // war3map.w3e terrain grid, world units
  "cameraBounds": [-5760, -6016, 5760, 6016, -5760, 6016, 5760, -6016],   // war3map.w3i, reference only
  "camps": [
    {
      "id": "c01",                  // stable: ordered by distance from map centre, then angle
      "x": 0.5, "y": 0.5,           // normalised 0-1 minimap position
      "worldX": 0, "worldY": 0,     // world units
      "creeps": [{ "id": "nftt", "name": "Forest Troll", "level": 2, "count": 2 }],
      "level": 12,                  // summed creep levels (per-instance, not per distinct type)
      "xp": 480,                    // summed creepXp(level) per creep instance, before hero-level factor
      "band": "hard",               // "easy" <=5, "medium" 6-11, "hard" >=12 (BAND_MAX_LEVEL in camps.mjs)
      "sleeps": true                // true only if every creep in the camp sleeps
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

There are two sourcing methods used across the table, both cited per-entry
via the `source` URL:

1. **`warcraft.wiki.gg`** (most entries): the per-unit wiki page's
   infobox `|level=` field, e.g.
   `https://warcraft.wiki.gg/wiki/Forest_Troll_Berserker`.
2. **Blizzard's own game data, patch 1.27.1 (enUS)**, mirrored in the
   [w3x2lni](https://github.com/sumneko/w3x2lni) repository — used for 11
   rawcodes that had no findable `warcraft.wiki.gg` page (`nmrl`, `nwwd`,
   `nslf`, `nwiz`, `nwzg`, `nfps`, `ntka`, `ntrh`, `ntrs`, `nhdc`, `nrdk`):
   name from
   [`neutralunitstrings.txt`](https://raw.githubusercontent.com/sumneko/w3x2lni/master/data/enUS-1.27.1/mpq/Custom_V1/Units/neutralunitstrings.txt)
   (`[id]` section, `Name=` field), level from
   [`unitbalance.slk`](https://raw.githubusercontent.com/sumneko/w3x2lni/master/data/enUS-1.27.1/mpq/Custom_V1/Units/unitbalance.slk)
   (row keyed by `unitBalanceID`, `level` column), `sleeps` from
   [`unitdata.slk`](https://raw.githubusercontent.com/sumneko/w3x2lni/master/data/enUS-1.27.1/mpq/Units/unitdata.slk)
   (row keyed by `unitID`, `canSleep` column — all 11 are `1`/true). The
   `source` recorded for these 11 entries is the `unitbalance.slk` URL
   (the level field); the other two files are cited here as the name/sleeps
   method rather than repeated per entry.

As of this feature, all 83 rawcodes referenced by the nine generated
catalogues are sourced.
