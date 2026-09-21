/**
 * Pure route derivations, layered on top of `xp.mjs`'s hero/creep xp math
 * and `clock.mjs`'s day clock. Given a `CreepRoute` (see `types.ts`) and the
 * `CreepMap` it was written for, works out what the page needs to show at
 * each stop: the day clock, whether it's night, and the hero's level/xp
 * running total (folding camps in the route's order, skipping non-camp
 * stops).
 */
import { creepXp, creepXpFactor, heroXpForLevel } from "./xp.mjs";
import { toDayClock, isNight } from "./clock.mjs";

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
 * without changing level/xp. Returns `{ stops, finalLevel, finalXp,
 * lastTime }`; each derived stop is `{ campId, camp, time, dayClock,
 * isNight, heroLevelAfter, xpAfter, campLevel, band }`. */
export function deriveRoute(route, map, { startLevel = 1 } = {}) {
  let level = startLevel;
  let xp = heroXpForLevel(startLevel);

  const stops = route.stops.map((stop) => {
    const camp = stop.campId ? findCamp(map, stop.campId) : null;
    if (camp) {
      const factor = creepXpFactor(level);
      for (const creep of camp.creeps) {
        for (let i = 0; i < creep.count; i++) {
          xp += creepXp(creep.level) * factor;
        }
      }
      level = levelForXp(xp);
    }
    return {
      campId: stop.campId ?? null,
      camp,
      time: stop.time,
      dayClock: toDayClock(stop.time),
      isNight: isNight(stop.time),
      heroLevelAfter: level,
      xpAfter: xp,
      campLevel: camp ? camp.level : null,
      band: camp ? camp.band : null,
    };
  });

  const lastTime = route.stops.length ? route.stops[route.stops.length - 1].time : 0;
  return { stops, finalLevel: level, finalXp: xp, lastTime };
}

/** First/last stop time and stop count. Pure, no map needed. */
export function routeBounds(route) {
  const times = route.stops.map((s) => s.time);
  return {
    firstTime: times.length ? Math.min(...times) : 0,
    lastTime: times.length ? Math.max(...times) : 0,
    stopCount: route.stops.length,
  };
}
