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
 * The race with the highest MMR among races of at least ten games. With no
 * such race it is the highest MMR of all, and with no ladder games at all it
 * is the race the player declared.
 * @param {readonly LadderRace[]} races
 * @param {Race} profileRace
 * @returns {Race}
 */
export function mainRace(races, profileRace) {
  const played = races.filter((r) => r.games > 0);
  if (!played.length) return profileRace;
  const rated = played.filter((r) => r.games >= GAMES_FLOOR);
  const pool = rated.length ? rated : played;
  return pool.reduce((best, r) => (r.mmr > best.mmr ? r : best)).race;
}
