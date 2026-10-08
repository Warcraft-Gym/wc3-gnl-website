/** Who currently holds each crown, read from the results.
 *
 * There used to be a `kings` field on the page that a coach set by hand.
 * That is how the old WordPress page ended up naming three kings its own
 * results section contradicted further down the same page — two places to
 * say the same thing, and only one of them maintained. The results are
 * entered weekly anyway, so the kings come from them.
 *
 * The kings are the winners of **one** event, not a per-bracket walk back
 * through history. Brackets have been written several ways over five years
 * — "1450-1600" in the imported archive, "1450 to 1600 MMR" as it is typed
 * today — so matching a bracket across events would need a naming rule
 * nobody has agreed, and would quietly pair a king crowned last week with
 * one from eight months ago. One event, one date, no guessing.
 *
 * Ten events in the archive list their matches but never say who won. Those
 * are skipped rather than blanking the section: the most recent event that
 * recorded a winner is the one that decided who holds the crowns.
 */

/** `{ date, kings: [{ bracket, player, ... }] }` from the newest result that
 *  recorded a winner, or null when none has. Order is the order the winners
 *  were entered — that is the author's, and the Studio can reorder it. */
export function currentKings(results) {
  if (!Array.isArray(results)) return null;

  // `getKothResults` sorts newest first, but do not rely on the caller: a
  // list in the wrong order would silently crown last year's winner.
  const byNewest = [...results]
    .filter((r) => typeof r?.date === "string")
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const result of byNewest) {
    const kings = (result.winners ?? []).filter((w) => w?.bracket && w?.player);
    if (kings.length) {
      return { date: result.date, kings };
    }
  }
  return null;
}
