/** The backend's winners read, `GET /koth/winners`, as the page's results.
 *
 * One row per published closed night, newest first, with the king every
 * bracket ended with. A night with no date and a bracket with no king are
 * left out: the page counts crowns and dates nights.
 */

/**
 * What a bracket is called on the page. The archive keeps the label the old
 * page wrote ("1600 to the mooon", "Gold and below"). A night the app ran
 * names its brackets "Bracket 1, 2, 3", which says nothing to a reader, so
 * those read as their MMR band in the app's words: from the bracket's own
 * bound to one below the next, and the top bracket has no ceiling.
 *
 * @param {string|null|undefined} name - The bracket's name
 * @param {number|null|undefined} low - Its lower bound
 * @param {Array<number|null|undefined>} bounds - The lower bounds of every bracket of the night
 * @returns {string}
 */
export function bracketLabel(name, low, bounds) {
  if (name && !/^bracket \d+$/i.test(name)) return name;
  const at = low ?? 0;
  const next = [...new Set(bounds.map((b) => b ?? 0))].sort((a, b) => a - b).find((b) => b > at);
  if (next === undefined) return `${at} MMR and up`;
  return at ? `${at} to ${next - 1} MMR` : `under ${next} MMR`;
}

/** `[{ id, date, winners: [{ bracket, player, userId, country }] }]`, newest first as the backend sends them.
 *  A winner has a user id and country once a reviewed link names the player's profile. */
export function toResults(nights) {
  return (Array.isArray(nights) ? nights : [])
    .filter((n) => typeof n?.date === "string" && Number.isInteger(n.event_id))
    .map((n) => {
      const bounds = (n.winners ?? []).map((w) => w?.lower_bound);
      return {
        id: n.event_id,
        date: n.date,
        winners: (n.winners ?? [])
          .filter((w) => w?.name)
          .map((w) => ({
            bracket: bracketLabel(w.bracket, w.lower_bound, bounds),
            // A profile name may carry its battle tag number: "Screwin#1463" reads "Screwin"
            player: w.name.trim().replace(/#\d+$/, ""),
            userId: Number.isInteger(w.user_id) ? w.user_id : null,
            country: typeof w.country === "string" && w.country ? w.country : null,
          })),
      };
    });
}
