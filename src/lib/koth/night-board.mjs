import { bracketLabel } from "./results.mjs";

/** One night's board, `GET /koth/nights/{id}/board`, as the rows the page draws.
 *
 * The same reading as the app's results table. An archived series names as
 * winner the side the old page wrote, else the side the order of play infers,
 * and keeps both sides when neither is known. A series the app ran carries
 * its winner. Rows read newest first, brackets weakest first.
 */

const CROWN = { moved: "Took the crown", held: "Defended the crown" };

const name = (side) => side?.name ?? "";

function archivedRows(history) {
  return [...(history ?? [])]
    .map((row, index) => ({ row, at: row.sequence ?? index }))
    .sort((a, b) => b.at - a.at)
    .map(({ row }) => {
      const side = row.winner_side || row.inferred_winner_side || null;
      const undecided = side !== 1 && side !== 2;
      const [winner, loser] = side === 2 ? [row.side2, row.side1] : [row.side1, row.side2];
      return {
        id: row.series_id,
        winner: name(winner),
        loser: name(loser),
        undecided,
        inferred: !undecided && !row.winner_side,
        // neither side played the next series: the winner withdrew, or with no winner known, the winner is unknown
        withdrew: !!row.winner_left || (!!row.forfeit && undecided),
        forfeit: false,
        crown: undecided ? null : (CROWN[row.throne] ?? null),
        note: row.review_note || null,
      };
    });
}

const playedRows = (played) =>
  (played ?? []).map((row) => ({
    id: row.series_id,
    winner: name(row.winner),
    loser: name(row.loser),
    undecided: false,
    inferred: false,
    withdrew: false,
    forfeit: !!row.forfeit,
    crown: CROWN[row.throne] ?? null,
    note: null,
  }));

/** `[{ id, label, king, rows }]`, weakest bracket first. */
export function nightBrackets(board) {
  const brackets = [...(board?.brackets ?? [])]
    .map((bracket, index) => ({ bracket, index, bound: bracket.lower_bound ?? -Infinity }))
    .sort((a, b) => a.bound - b.bound || b.index - a.index)
    .map(({ bracket }) => bracket);
  const bounds = brackets.map((b) => b.lower_bound);
  return brackets.map((b) => ({
    id: b.division_id,
    label: bracketLabel(b.name, b.lower_bound, bounds),
    king: b.king?.name ?? b.historical_king?.name ?? null,
    rows: board?.historical ? archivedRows(b.history) : playedRows(b.played),
  }));
}
