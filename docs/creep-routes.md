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
