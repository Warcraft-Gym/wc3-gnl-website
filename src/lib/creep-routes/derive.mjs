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
 * stop with `hero: false` earns XP like any other: hero XP is global, the flag only
 * says the hero is not there to fight (one hero assumed). A split (`stop.split`) derives every arm and carries them as
 * `split: { mode, walked, arms: [{ label, stops, levelAfter, xpAfter }] }`;
 * arm stops carry `armIndex` and `forkKey`, and `choice` maps a split key
 * ("2") to the arm the hero walks in an "or" split (default 0). */
export function deriveRoute(route, map, { startLevel = 1, choice = {} } = {}) {
  let level = startLevel;
  let xp = heroXpForLevel(startLevel);

  const stops = route.stops.map((stop, i) => {
    const parallel = stop.split?.mode === "and";
    const rawArms = stop.split?.arms;
    if (!rawArms) {
      const d = deriveStop(stop, map, level, xp, false);
      level = d.heroLevelAfter;
      xp = d.xpAfter;
      return d;
    }
    // A split: in "or"/"xor" every arm is derived from the state at the split and only
    // the walked arm (`choice[forkKey]`) feeds the running total. In "and" every arm
    // feeds it; arms 1.. run without the hero whatever their own flags say.
    // ponytail: "and" arms add up in list order (a, then b); the model has no time.
    const forkKey = String(i);
    const walked = parallel ? 0 : Math.min(Math.max(0, choice[forkKey] ?? 0), rawArms.length - 1);
    const startLevelAt = level;
    const startXpAt = xp;
    const arms = rawArms.map((arm, armIndex) => {
      let armLevel = parallel ? level : startLevelAt;
      let armXp = parallel ? xp : startXpAt;
      const armStops = arm.stops.map((s) => {
        const d = deriveStop(s, map, armLevel, armXp, parallel && armIndex > 0);
        armLevel = d.heroLevelAfter;
        armXp = d.xpAfter;
        return { ...d, armIndex, forkKey };
      });
      if (parallel) {
        level = armLevel;
        xp = armXp;
      }
      return { label: arm.label, stops: armStops, levelAfter: armLevel, xpAfter: armXp };
    });
    if (!parallel && arms[walked]) {
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
      split: { mode: stop.split.mode, walked, arms },
    };
  });

  return { stops, finalLevel: level, finalXp: xp };
}

/** One plain stop from the hero's `level`/`xp`; `absent` marks a stop of an "and" way without the hero. */
function deriveStop(stop, map, level, xp, absent) {
  const camp = stop.campId ? findCamp(map, stop.campId) : null;
  const kills = [];
  if (camp) {
    for (const { row, ordered, unit, inSet } of killUnits(camp, stop.kills, stop.leaveRest)) {
      const creep = camp.creeps[row];
      const factor = creepXpFactor(level);
      // Floor each creep's grant, same rounding as xp.mjs's
      // `heroLevelAfter` — see docs/creep-routes.md's "XP model".
      const gain = Math.floor(creepXp(creep.level) * factor);
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
