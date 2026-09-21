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
every entry there carries the `warcraft.wiki.gg` URL it was read from. The
script never guesses: a creep id it cannot find in that table makes
catalogue building throw, naming the id, rather than shipping a wrong
level. See `scripts/creep-maps/README.md` for exactly how to get map files,
run the script, read the JSON it writes, and the current list of rawcodes
that could not be sourced (and so currently block catalogue generation for
every map that places one).

This feature ships the script, its fixtures and tests, and the sourced
creep table; it does not ship a full set of generated catalogues — see the
README's "gaps" section for why, and the feature handoff for the exact
per-map blockers. Later features build the route-planning UI on top of
`src/lib/creep-routes/maps/<slug>.json` once catalogues exist for it to
read.
