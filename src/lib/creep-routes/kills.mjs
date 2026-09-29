/**
 * A stop's optional kill order. `kills` is the ordered prefix, a list of
 * `{ row, n }`: `row` is an index into the camp's `creeps[]`, `n` how many
 * creeps of that row to kill. A row index, not a unit rawcode, because 21
 * of 241 catalogue camps list one rawcode twice, split only by item drop
 * (Last Refuge c04 has two Forest Troll rows, one with the item) — only the
 * row can say "the item troll". Empty or missing means the whole camp, in
 * catalogue order. An entry may carry an integer `set`: consecutive entries
 * with the same `set` form one set unit (kills in any order); an entry
 * without `set` is one single unit per kill. The stop's `leaveRest` says
 * what happens to the creeps the list does not name: false (default) kills
 * them after it as one trailing set, in catalogue order; true leaves them
 * alive.
 */
import { creepXp } from "./xp.mjs";

/** The kill list cut to this camp: rows the camp lacks dropped, each `n`
 *  capped at the creeps that row has left. Every helper reads this list. */
export function validKills(camp, kills) {
  const used = camp.creeps.map(() => 0);
  const out = [];
  for (const { row, n, set } of kills ?? []) {
    if (!Number.isInteger(row) || !camp.creeps[row]) continue;
    const take = Math.min(n, camp.creeps[row].count - used[row]);
    if (take <= 0) continue;
    used[row] += take;
    out.push(Number.isInteger(set) ? { row, n: take, set } : { row, n: take });
  }
  return out;
}

/** One `{ row, ordered, unit, inSet }` per kill, in kill order: the listed
 *  kills (a single per kill without `set`, one unit per run of the same
 *  `set`), then, unless `leaveRest`, the rest of the camp as one trailing
 *  set in catalogue order. `unit` is the 0-based unit index. */
export function killUnits(camp, kills, leaveRest = false) {
  const out = [];
  let unit = -1;
  let prevSet;
  for (const { row, set } of flatKillItems(validKills(camp, kills))) {
    if (set === undefined || set !== prevSet) unit++;
    prevSet = set;
    out.push({ row, ordered: true, unit, inSet: set !== undefined });
  }
  if (leaveRest && out.length) return out;
  const rest = unorderedCreeps(camp, kills);
  if (rest.length) unit++;
  for (const { row } of rest) out.push({ row, ordered: false, unit, inSet: true });
  return out;
}

/** Row index of every creep killed at this stop, one per kill, in kill
 *  order: the prefix, then (unless `leaveRest`) the rest in catalogue order. */
export function killRows(camp, kills, leaveRest = false) {
  return killUnits(camp, kills, leaveRest).map((k) => k.row);
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
  const seenSets = new Set();
  let prevSet;
  for (const { row, n, set } of kills) {
    if (!Number.isInteger(row) || row < 0 || row >= counts.length) return "Unknown creep in this camp";
    used[row] += n;
    if (used[row] > counts[row]) return "More kills than creeps in this camp";
    if (set !== undefined && set !== prevSet && seenSets.has(set)) return "A set's kills must be next to each other";
    if (set !== undefined) seenSets.add(set);
    prevSet = set;
  }
  return null;
}

/** Appends one single kill of `row`, merging into the last entry when it is
 *  the same row and not in a set, so clicking a troll twice reads "Troll
 *  ×2". Returns the same list when that row has no creep left. */
export function addKill(kills, row, counts) {
  const list = kills ?? [];
  const used = list.filter((k) => k.row === row).reduce((sum, k) => sum + k.n, 0);
  if (used >= (counts[row] ?? 0)) return list;
  const last = list[list.length - 1];
  if (last && last.row === row && last.set === undefined) return [...list.slice(0, -1), { row, n: last.n + 1 }];
  return [...list, { row, n: 1 }];
}

/** For each creep row, the 1-based unit steps of the listed kills that
 *  kill it, e.g. `[[2], [], [1, 3]]`; a set's members share its step. The
 *  camp card's "Kill" column. */
export function killStepsByRow(camp, kills) {
  const steps = camp.creeps.map(() => []);
  for (const { row, unit, ordered } of killUnits(camp, kills, true)) {
    if (ordered && !steps[row].includes(unit + 1)) steps[row].push(unit + 1);
  }
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

/** One `{ row, set }` per kill, in kill order (`set` undefined for a single). */
export function flatKillItems(kills) {
  return (kills ?? []).flatMap(({ row, n, set }) => Array.from({ length: n }, () => ({ row, set })));
}

/** Rows (or `{ row, set }` items) back to `{ row, n, set? }[]`, merging
 *  consecutive kills of the same row and set. */
export function mergeKills(items) {
  const out = [];
  for (const item of items) {
    const { row, set } = typeof item === "number" ? { row: item, set: undefined } : item;
    const last = out[out.length - 1];
    if (last && last.row === row && last.set === set) last.n++;
    else out.push(set === undefined ? { row, n: 1 } : { row, n: 1, set });
  }
  return out;
}

/** A set with one member left is a single. */
function dropLoneSets(items) {
  const count = new Map();
  for (const { set } of items) if (set !== undefined) count.set(set, (count.get(set) ?? 0) + 1);
  return items.map((it) => (it.set !== undefined && count.get(it.set) === 1 ? { row: it.row, set: undefined } : it));
}

/** Removes the `index`-th listed kill; a set left with one member becomes a single. */
export function removeKillAt(kills, index) {
  return mergeKills(dropLoneSets(flatKillItems(kills).filter((_, i) => i !== index)));
}

/** Joins the single kill at `index` with the unit before it: into that set
 *  when it is a set, else into a new set with the previous single. */
export function joinWithPrevious(kills, index) {
  const items = flatKillItems(kills);
  const prev = items[index - 1];
  if (!prev || items[index]?.set !== undefined) return kills;
  const used = items.map((it) => it.set).filter((s) => s !== undefined);
  const set = prev.set ?? (used.length ? Math.max(...used) + 1 : 0);
  return mergeKills(items.map((it, i) => (i === index || i === index - 1 ? { row: it.row, set } : it)));
}

/** Dissolves set `set` into singles, in list order. */
export function splitSet(kills, set) {
  return mergeKills(flatKillItems(kills).map((it) => (it.set === set ? { row: it.row, set: undefined } : it)));
}
