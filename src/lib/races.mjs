/**
 * The main race is a display choice, not a data fact.
 * See the "Races" section of DESIGN.md.
 * Plain JavaScript so `node --test` runs the tests with no loader.
 */

/** @typedef {import("./utils").Race} Race */
/** @typedef {{ race: Race, mmr: number, games: number }} LadderRace */

/** Races under this many games are noise, so they do not claim the masthead. */
const GAMES_FLOOR = 10;

/**
 * The race with the highest MMR among ladder races of at least ten games, and
 * the more played race on an exact tie. It answers null when no race reaches
 * ten games, so ladder data alone decides the main race.
 * @param {readonly LadderRace[]} races
 * @returns {Race | null}
 */
export function mainRace(races) {
  const rated = races.filter((r) => r.games >= GAMES_FLOOR);
  if (!rated.length) return null;
  return rated.reduce((best, r) => (r.mmr > best.mmr || (r.mmr === best.mmr && r.games > best.games) ? r : best)).race;
}
