/**
 * Pure route derivations, layered on top of `xp.mjs`'s hero/creep xp math.
 * Given a `CreepRoute` (see `types.ts`) and the `CreepMap` it was written
 * for, works out what the page needs to show at each stop: the hero's
 * running level/xp total, folding camps in the route's order, skipping
 * non-camp stops. A route has no time dimension — order is everything.
 */
import { creepsLeft, killUnits } from "./kills.mjs";
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
 * `{ creep, row, ordered, unit, inSet, xp, levelAfter, leveledUp }` per
 * kill, in kill order: whether the author listed it, its 0-based unit and
 * whether that unit is a set (XP inside a set follows list order), the xp it paid and the level it
 * left the hero at. The creep-xp reduction factor (`creepXpFactor`) is re-read at
 * the hero's *current* level on every single kill, not fixed once per camp
 * — Blizzard's `HeroFactorXP` table applies per kill (see
 * docs/creep-routes.md's "XP model"), so a hero that levels up mid-camp
 * pays the new, lower factor for the rest of that camp's kills. A
 * stop with `hero: false` has kills with `xp: 0` and leaves level/xp unchanged.
 * A fork stop (`stop.fork`) derives every arm and carries them as
 * `fork: { mode, walked, arms: [{ label, stops, levelAfter, xpAfter }] }`;
 * arm stops carry `armIndex` and `forkKey`, and `choice` maps a fork key
 * ("2") to the arm the hero walks in "either" mode (default 0). */
export function deriveRoute(route, map, { startLevel = 1, choice = {} } = {}) {
  let level = startLevel;
  let xp = heroXpForLevel(startLevel);

  const stops = route.stops.map((stop, i) => {
    if (!stop.fork) {
      const d = deriveStop(stop, map, level, xp, false);
      level = d.heroLevelAfter;
      xp = d.xpAfter;
      return d;
    }
    // A fork: every arm is derived from the hero's state at the fork. The hero
    // walks one arm (`choice[forkKey]` in "either", arm 0 in "both"); only that
    // arm feeds the running total. In "both" arms 1.. are without the hero.
    const { mode, arms: rawArms } = stop.fork;
    const forkKey = String(i);
    const walked = mode === "both" ? 0 : Math.min(Math.max(0, choice[forkKey] ?? 0), rawArms.length - 1);
    const arms = rawArms.map((arm, armIndex) => {
      let armLevel = level;
      let armXp = xp;
      const armStops = arm.stops.map((s) => {
        const d = deriveStop(s, map, armLevel, armXp, mode === "both" && armIndex > 0);
        armLevel = d.heroLevelAfter;
        armXp = d.xpAfter;
        return { ...d, armIndex, forkKey };
      });
      return { label: arm.label, stops: armStops, levelAfter: armLevel, xpAfter: armXp };
    });
    if (arms[walked]) {
      level = arms[walked].levelAfter;
      xp = arms[walked].xpAfter;
    }
    return {
      campId: null,
      camp: null,
      heroLevelAfter: level,
      xpAfter: xp,
      campLevel: null,
      band: null,
      left: 0,
      kills: [],
      fork: { mode, walked, arms },
    };
  });

  return { stops, finalLevel: level, finalXp: xp };
}

/** One non-fork stop from the hero's `level`/`xp`; `absent` forces "without the hero". */
function deriveStop(stop, map, level, xp, absent) {
  const camp = stop.campId ? findCamp(map, stop.campId) : null;
  const noHero = absent || stop.hero === false;
  const kills = [];
  if (camp) {
    for (const { row, ordered, unit, inSet } of killUnits(camp, stop.kills, stop.leaveRest)) {
      const creep = camp.creeps[row];
      const factor = creepXpFactor(level);
      // Floor each creep's grant, same rounding as xp.mjs's
      // `heroLevelAfter` — see docs/creep-routes.md's "XP model". A stop
      // the hero does not go to (`hero: false`) grants the hero nothing.
      const gain = noHero ? 0 : Math.floor(creepXp(creep.level) * factor);
      xp += gain;
      const levelAfter = levelForXp(xp);
      kills.push({ creep, row, ordered, unit, inSet, xp: gain, levelAfter, leveledUp: levelAfter > level });
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
    ...(absent ? { hero: false } : {}),
  };
}
