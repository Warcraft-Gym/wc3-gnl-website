/**
 * The per-race split of one W3Champions ladder season, read from the
 * race-on-map-versus-race payload.
 * Plain JavaScript so `node --test` runs the test with no loader.
 */

/** W3Champions race ids, here the opponent of each row. */
const RACE_BY_ID = { 0: "random", 1: "human", 2: "orc", 4: "nightelf", 8: "undead" };

/** The row that holds every race the player picked, together. */
const ALL_OWN_RACES = 16;

/**
 * Season record against each opponent race, over every map and every race the
 * player picked. Returns null when the payload carries no such row, so the
 * caller can drop the split instead of showing a smaller sample.
 * @param {any} raw
 * @returns {Partial<Record<"human"|"orc"|"nightelf"|"undead"|"random", {wins: number, losses: number}>> | null}
 */
export function vsRaceOfSeason(raw) {
  const byOwnRace = raw?.raceWinsOnMapByPatch?.All;
  if (!Array.isArray(byOwnRace)) return null;
  const overall = byOwnRace
    .find((r) => r?.race === ALL_OWN_RACES)
    ?.winLossesOnMap?.find((m) => m?.map === "Overall");
  if (!Array.isArray(overall?.winLosses)) return null;
  /** @type {any} */
  const out = {};
  for (const row of overall.winLosses) {
    const race = RACE_BY_ID[row?.race];
    if (!race || (row.wins ?? 0) + (row.losses ?? 0) === 0) continue;
    out[race] = { wins: row.wins, losses: row.losses };
  }
  return Object.keys(out).length ? out : null;
}
