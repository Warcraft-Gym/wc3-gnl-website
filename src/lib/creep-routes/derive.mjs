/**
 * Pure route derivations, layered on top of `xp.mjs`'s hero/creep xp math.
 * Given a `CreepRoute` (see `types.ts`) and the `CreepMap` it was written
 * for, works out what the page needs to show at each stop: the hero's
 * running level/xp total, folding camps in the route's order, skipping
 * non-camp stops. A route has no time dimension — order is everything.
 */
import { creepsLeft, flatKills, hasKillOrder, killRows } from "./kills.mjs";
import { creepXp, creepXpFactor, heroXpForLevel } from "./xp.mjs";

function findCamp(map, campId) {
  return map.camps.find((c) => c.id === campId) ?? null;
}

function levelForXp(xp) {
  let level = 1;
  while (heroXpForLevel(level + 1) <= xp) level++;
  return level;
}

/** Runs a hero through `route.stops` in order against `map`'s camps.
 * Non-camp stops (`campId: null`, e.g. a TP-home or shop stop) pass through
 * without changing level/xp. Returns `{ stops, finalLevel, finalXp }`; each
 * derived stop is `{ campId, camp, heroLevelAfter, xpAfter, campLevel,
 * band, left, kills }`. A stop's `kills` is the ordered prefix; the rest of
 * the camp dies after it unless `leaveRest` (see `kills.mjs`); `left` is how
 * many creeps the stop leaves alive. The derived `kills` is one
 * `{ creep, row, ordered, xp, levelAfter, leveledUp }` per kill, in kill
 * order: whether the author ordered it, the xp it paid and the level it
 * left the hero at. The creep-xp reduction factor (`creepXpFactor`) is re-read at
 * the hero's *current* level on every single kill, not fixed once per camp
 * — Blizzard's `HeroFactorXP` table applies per kill (see
 * docs/creep-routes.md's "XP model"), so a hero that levels up mid-camp
 * pays the new, lower factor for the rest of that camp's kills. */
export function deriveRoute(route, map, { startLevel = 1 } = {}) {
  let level = startLevel;
  let xp = heroXpForLevel(startLevel);

  const stops = route.stops.map((stop) => {
    const camp = stop.campId ? findCamp(map, stop.campId) : null;
    const kills = [];
    if (camp) {
      const ordered = hasKillOrder(stop) ? flatKills(stop.kills).length : 0;
      for (const row of killRows(camp, stop.kills, stop.leaveRest)) {
        const creep = camp.creeps[row];
        const factor = creepXpFactor(level);
        // Floor each creep's grant, same rounding as xp.mjs's
        // `heroLevelAfter` — see docs/creep-routes.md's "XP model".
        const gain = Math.floor(creepXp(creep.level) * factor);
        xp += gain;
        const levelAfter = levelForXp(xp);
        kills.push({ creep, row, ordered: kills.length < ordered, xp: gain, levelAfter, leveledUp: levelAfter > level });
        level = levelAfter;
      }
    }
    return {
      campId: stop.campId ?? null,
      camp,
      heroLevelAfter: level,
      xpAfter: xp,
      campLevel: camp ? camp.level : null,
      band: camp ? camp.band : null,
      left: camp ? creepsLeft(camp, stop.kills, stop.leaveRest) : 0,
      kills,
    };
  });

  return { stops, finalLevel: level, finalXp: xp };
}
