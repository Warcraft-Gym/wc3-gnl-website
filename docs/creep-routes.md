# Creep routes

## Map catalogue script

`scripts/creep-maps/build.mjs` turns a W3Champions `.w3x`/`.w3m` map file
into a **map catalogue**: JSON describing every creep camp (its creeps,
summed level, xp and difficulty band), the two start spots, the gold mines,
the neutral-passive shops and the terrain bounds, plus a 256x256 minimap
PNG. `src/lib/creep-routes/xp.mjs` has the pure creep/hero XP math
(`creepXp`, `heroXpForLevel`, `creepXpFactor`, `heroLevelAfter`) later
features use to route a hero through camps in xp order.

Everything the script knows about a creep — its name, level and whether it
sleeps until attacked — comes from `src/lib/creep-routes/creeps.json`, and
every entry there carries a source URL it was read from (`warcraft.wiki.gg`
for most entries; Blizzard's own 1.27.1 game data, mirrored in the
`w3x2lni` repository, for 11 rawcodes no `warcraft.wiki.gg` page could be
found for). The script never guesses: a creep id it cannot find in that
table makes catalogue building throw, naming the id, rather than shipping a
wrong level. See `scripts/creep-maps/README.md` for exactly how to get map
files, run the script (including its `--creeps <path>` override for testing
against a scratch table), and read the JSON it writes.

This feature ships the script, its fixtures and tests, the sourced creep
table (83 rawcodes) and generated catalogues for all nine bundle maps
(`src/lib/creep-routes/maps/<slug>.json` plus their minimaps at
`public/maps/<slug>.png`): `autumn-leaves`, `echo-isles`, `last-refuge`,
`northern-isles`, `shallow-grave`, `springtime`, `tidehunters`,
`turtle-rock`, `twisted-meadows`. Later features build the route-planning
UI on top of these catalogues.
