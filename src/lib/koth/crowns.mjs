import { bracketFloor } from "./bracket-art.mjs";

/** Reading the roll of honour: the order of a night's crowns, and who has worn the most. */

const BELOW = /\b(below|under|and down)\b/i;

/** A night's crowns strongest bracket first, read from each label as the emblem
 *  rule reads it: a "below" bracket is the floor, else the label's entry MMR.
 *  The backend lists brackets in their stored order, which differs between an
 *  archived night and one the app ran. */
export function topFirst(winners) {
  const rank = (bracket) => (BELOW.test(bracket ?? "") ? -1 : (bracketFloor(bracket) ?? 0));
  return [...(winners ?? [])]
    .map((w, i) => ({ w, i, r: rank(w.bracket) }))
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .map(({ w }) => w);
}

/** Every crowned player, most crowns first, with the years of the first and
 *  last crown. A name counts as the backend stores it: the page cannot tell
 *  whether "Elu" and "elu" are one player on two races or two players, so
 *  joining spellings is the import's job, with a reviewed list, not the page's. */
export function mostCrowns(results) {
  const players = new Map();
  for (const night of results ?? []) {
    if (typeof night?.date !== "string") continue;
    for (const w of night.winners ?? []) {
      const name = typeof w?.player === "string" ? w.player.trim() : "";
      if (!name) continue;
      const p = players.get(name) ?? { player: name, crowns: 0, first: night.date, last: night.date };
      p.crowns += 1;
      if (night.date < p.first) p.first = night.date;
      if (night.date > p.last) p.last = night.date;
      players.set(name, p);
    }
  }
  return [...players.values()]
    .map((p) => ({ player: p.player, crowns: p.crowns, first: p.first.slice(0, 4), last: p.last.slice(0, 4) }))
    .sort((a, b) => b.crowns - a.crowns || a.player.localeCompare(b.player));
}
