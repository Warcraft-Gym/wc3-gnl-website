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
node scripts/creep-maps/build.mjs <map.w3x> [more.w3x…] --out <dir> [--debug]
```

Writes `<dir>/<slug>.json` and `<dir>/<slug>.png` per map. `--debug` also
writes `<dir>/<slug>.debug.png`: the minimap at 3x with camps (coloured by
band), mines (gold) and starts (blue) drawn on top, for eyeballing that the
world → minimap coordinate mapping lines up.

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

## The creep table and its gaps

`src/lib/creep-routes/creeps.json` maps a creep's 4-character rawcode (e.g.
`nftt`) to `{ name, level, sleeps, source }`. Every entry's `level` is read
from `https://warcraft.wiki.gg` — the script refuses to guess: an unknown
rawcode makes catalogue building throw, naming the id, instead of silently
shipping a wrong level.

As of this feature, **72 rawcodes are sourced**; the following are not,
because no page on `warcraft.wiki.gg` could be found carrying a `|level=`
field for them despite checking the exact name, a `(Warcraft III)`
disambiguation, the wiki's `opensearch`, and cross-referencing six
tileset "Creeps <Tileset>" navigation templates (Ashenvale, Barrens,
Dalaran, Dungeon, Lordaeron, Northrend, Sunken, Village):

- `nmrl` "Murloc" (the base tier — `Murloc Huntsman`/`Nightcrawler`/
  `Tiderunner`/`Flesheater` all have pages, plain `Murloc` does not)
- `nwwd` "Dire Wendigo" (not one of the wiki's four documented Wendigo tiers:
  Wendigo, Elder Wendigo, Wendigo Shaman, Ancient Wendigo)
- `nslf` "Soulless" (no page under that title or a `(Warcraft III)` variant)
- `ntka` "Tuskarr" (lore/race page only, no per-unit stats page)
- `ntrh` "Hardened Sea Turtle", `ntrs` "Snapping Turtle" (not among the
  wiki's Sunken Ruins turtle tiers: Hatchling, Sea Turtle, Giant, Gargantuan,
  Dragon Turtle)
- `nwiz`, `nwzg` "Wizard" (the wiki documents four "Renegade wizard" tiers —
  Apprentice, Rogue, Renegade, Dark — but nothing ties either rawcode to a
  specific one)
- `nfps` "Searing Destroyer", `nhdc`, `nrdk` — HiveWorkshop's creep-camp list
  either has no name for these or names a page that turned out to be
  unrelated World of Warcraft content

Until these are sourced, catalogue building throws on any map that places
one of these creeps — currently all nine bundle maps hit at least one (most
commonly `nmrl`). See the feature handoff for the full list of which id
blocks which map. The fix is either finding the right wiki page (a
different title this script's author did not think to try) or reading the
name/level straight out of the World Editor's Object Data for that rawcode
and citing that as the source instead.
