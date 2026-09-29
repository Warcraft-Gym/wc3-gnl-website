/**
 * A stop's optional kill order. `kills` is the ordered prefix, a list of
 * `{ row, n }`: `row` is an index into the camp's `creeps[]`, `n` how many
 * creeps of that row to kill. A row index, not a unit rawcode, because 21
 * of 241 catalogue camps list one rawcode twice, split only by item drop
 * (Last Refuge c04 has two Forest Troll rows, one with the item) — only the
 * row can say "the item troll". Empty or missing means the whole camp, in
 * catalogue order. The stop's `leaveRest` says what happens to the creeps
 * the prefix does not list: false (default) kills them after the prefix, in
 * catalogue order; true leaves them alive.
 */
import { creepXp } from "./xp.mjs";

/** The kill list cut to this camp: rows the camp lacks dropped, each `n`
 *  capped at the creeps that row has left. Every helper reads this list. */
export function validKills(camp, kills) {
  const used = camp.creeps.map(() => 0);
  const out = [];
  for (const { row, n } of kills ?? []) {
    if (!Number.isInteger(row) || !camp.creeps[row]) continue;
    const take = Math.min(n, camp.creeps[row].count - used[row]);
    if (take <= 0) continue;
    used[row] += take;
    out.push({ row, n: take });
  }
  return out;
}

/** Row index of every creep killed at this stop, one per kill, in kill
 *  order: the prefix, then (unless `leaveRest`) the rest in catalogue order. */
export function killRows(camp, kills, leaveRest = false) {
  const prefix = flatKills(validKills(camp, kills));
  const rest = leaveRest && prefix.length ? [] : unorderedCreeps(camp, kills).map((c) => c.row);
  return [...prefix, ...rest];
}

/** Every creep killed at this stop, one entry per kill, in kill order. */
export function campKills(camp, kills, leaveRest = false) {
  return killRows(camp, kills, leaveRest).map((row) => camp.creeps[row]);
}

/** How many of the camp's creeps this stop leaves alive. */
export function creepsLeft(camp, kills, leaveRest = false) {
  const total = camp.creeps.reduce((sum, c) => sum + c.count, 0);
  return total - killRows(camp, kills, leaveRest).length;
}

/** First problem with `kills` against a camp's row counts, or null.
 *  `counts[i]` is `camp.creeps[i].count`. */
export function killsProblem(kills, counts) {
  const used = counts.map(() => 0);
  for (const { row, n } of kills) {
    if (!Number.isInteger(row) || row < 0 || row >= counts.length) return "Unknown creep in this camp";
    used[row] += n;
    if (used[row] > counts[row]) return "More kills than creeps in this camp";
  }
  return null;
}

/** Appends one kill of `row`, merging into the last entry when it is the
 *  same row, so clicking a troll twice reads "Troll ×2". Returns the same
 *  list when that row has no creep left. */
export function addKill(kills, row, counts) {
  const list = kills ?? [];
  const used = list.filter((k) => k.row === row).reduce((sum, k) => sum + k.n, 0);
  if (used >= (counts[row] ?? 0)) return list;
  const last = list[list.length - 1];
  if (last && last.row === row) return [...list.slice(0, -1), { row, n: last.n + 1 }];
  return [...list, { row, n: 1 }];
}

/** For each creep row, the 1-based steps of the ordered prefix that kill
 *  it, one per kill, e.g. `[[2], [], [1, 3]]` — the camp card's "Kill" column. */
export function killStepsByRow(camp, kills) {
  const steps = camp.creeps.map(() => []);
  flatKills(validKills(camp, kills)).forEach((row, i) => steps[row].push(i + 1));
  return steps;
}

/** SVG path of a pie wedge covering `fraction` of a circle, clockwise from
 *  12 o'clock — the killed share of a partly cleared camp's marker. */
export function wedgePath(cx, cy, r, fraction) {
  const a = 2 * Math.PI * Math.min(Math.max(fraction, 0), 0.9999);
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  const large = fraction > 0.5 ? 1 : 0;
  return `M${cx} ${cy}L${cx} ${cy - r}A${r} ${r} 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`;
}

/** Every creep not in the kill list, one `{ creep, row }` per creep, in
 *  catalogue order: the ghosted icons after a stop's kill chain, and the
 *  builder's "kill next" choices. An empty list returns the whole camp. */
export function unorderedCreeps(camp, kills) {
  const used = camp.creeps.map(() => 0);
  for (const { row, n } of validKills(camp, kills)) used[row] += n;
  return camp.creeps.flatMap((creep, row) =>
    Array.from({ length: Math.max(creep.count - used[row], 0) }, () => ({ creep, row })),
  );
}

/** Share of the camp's base creep XP (`creepXp(level)`, no hero factor)
 *  that the kill list takes: the killed wedge of a partly cleared camp's
 *  marker. 1 unless the stop leaves the rest alive. */
export function killedXpShare(camp, kills, leaveRest = false) {
  if (!validKills(camp, kills).length || !leaveRest) return 1;
  const total = camp.creeps.reduce((sum, c) => sum + creepXp(c.level) * c.count, 0);
  const killed = campKills(camp, kills, true).reduce((sum, c) => sum + creepXp(c.level), 0);
  return total ? killed / total : 1;
}

/** One row index per kill, in kill order: `[{row: 2, n: 2}]` → `[2, 2]`. */
export function flatKills(kills) {
  return (kills ?? []).flatMap(({ row, n }) => Array(n).fill(row));
}

/** Row indexes back to `{ row, n }[]`, merging consecutive equal rows. */
export function mergeKills(rows) {
  const out = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    if (last && last.row === row) last.n++;
    else out.push({ row, n: 1 });
  }
  return out;
}
