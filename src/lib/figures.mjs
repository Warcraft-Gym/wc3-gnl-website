/**
 * One way to write a record, a rate and a result on the site.
 * See the "Figures" and "Results" sections of DESIGN.md.
 * Plain JavaScript so `node --test` runs the tests with no loader.
 */

const EN_DASH = "–";

/**
 * Win share as a rounded percent, or null when nothing was played.
 * @param {number} wins
 * @param {number} losses
 * @returns {number | null}
 */
export function rate(wins, losses) {
  const played = wins + losses;
  return played ? Math.round((wins * 100) / played) : null;
}

/**
 * A record as "19 – 11", carrying its percent from ten played: "19 – 11 (63%)".
 * With draws it reads "6 – 1 – 3" and carries no percent.
 * Returns null when nothing was played; the caller prints an em dash.
 * @param {number} wins
 * @param {number} losses
 * @param {number} [draws]
 * @returns {string | null}
 */
export function record(wins, losses, draws) {
  const played = wins + losses + (draws ?? 0);
  if (!played) return null;
  if (draws != null) return `${wins} ${EN_DASH} ${draws} ${EN_DASH} ${losses}`;
  const percent = played >= 10 ? ` (${rate(wins, losses)}%)` : "";
  return `${wins} ${EN_DASH} ${losses}${percent}`;
}

/**
 * A result read from one side: "Won 2 : 1", "Lost 1 : 2", "Drew 1 : 1".
 * @param {number} own
 * @param {number} other
 * @returns {string}
 */
export function resultLabel(own, other) {
  const verb = own > other ? "Won" : own < other ? "Lost" : "Drew";
  return `${verb} ${own} : ${other}`;
}
