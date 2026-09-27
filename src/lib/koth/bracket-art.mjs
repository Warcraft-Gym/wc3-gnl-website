/** Which crown emblem a bracket gets.
 *
 * Chosen from the bracket's own text, not its position in the list. The
 * brackets have been written several ways — "1600+" in the imported archive,
 * "1600 to 1750 MMR" as it is typed today, "Platinum to 1700 MMR" back in
 * 2021 — and the Studio's array order is the author's to change. Keying off
 * either would swap the artwork under a reader for no reason.
 *
 * The rule is the one a player would use reading the label:
 *
 *   - anything "and below" / "under" is the bottom bracket, whatever number
 *     it names — "1450 and below" and "Gold and below" are both the floor;
 *   - otherwise the *lowest* number in the label is its entry requirement,
 *     so a bigger one means a higher bracket.
 *
 * Three brackets, three emblems, and the crown on the hill goes to the top.
 */

/** The crown on the plinth is the top bracket: it is the one that actually
 *  looks like a king of the hill, so it belongs to the players at the top of
 *  it. The other two fill in below. */
const TOP = "/graphics/koth-crown-hill-1.png";
const MIDDLE = "/graphics/koth-crown-peak-1.png";
const BOTTOM = "/graphics/koth-crown-sword-1.png";

/** Where the top bracket starts. 1600 is the line the Gym has used for years
 *  ("1600 and above", "1600 to 1750"); anything at or over it is the top. */
export const TOP_BRACKET_FLOOR = 1600;

const BELOW = /\b(below|under|and down)\b/i;

/** The bracket's entry MMR — the lowest number in the label — or null. */
export function bracketFloor(bracket) {
  if (typeof bracket !== "string") return null;
  const numbers = bracket.match(/\d{3,4}/g);
  return numbers ? Math.min(...numbers.map(Number)) : null;
}

/** The emblem for a bracket. Unlabelled or unrecognised brackets get the
 *  middle one rather than nothing: an emblem is decoration, and a missing
 *  image would read as an error. */
export function bracketArt(bracket) {
  if (typeof bracket === "string" && BELOW.test(bracket)) return BOTTOM;
  const floor = bracketFloor(bracket);
  if (floor === null) return MIDDLE;
  return floor >= TOP_BRACKET_FLOOR ? TOP : MIDDLE;
}

export const BRACKET_ART = { TOP, MIDDLE, BOTTOM };
