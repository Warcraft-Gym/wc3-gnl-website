/**
 * A stop's optional kill order. `kills` is an ordered list of
 * `{ row, n }`: `row` is an index into the camp's `creeps[]`, `n` how many
 * creeps of that row to kill. A row index, not a unit rawcode, because 21
 * of 241 catalogue camps list one rawcode twice, split only by item drop
 * (Last Refuge c04 has two Forest Troll rows, one with the item) — only the
 * row can say "the item troll". Empty or missing means the whole camp, in
 * catalogue order. Creeps not listed stay alive.
 */

/** True when the stop names its own kill order. */
export function hasKillOrder(stop) {
  return Array.isArray(stop?.kills) && stop.kills.length > 0;
}

/** Every creep killed at this stop, one entry per kill, in kill order. */
export function campKills(camp, kills) {
  if (!kills?.length) return camp.creeps.flatMap((creep) => Array(creep.count).fill(creep));
  return kills.flatMap(({ row, n }) => {
    const creep = camp.creeps[row];
    return creep ? Array(n).fill(creep) : [];
  });
}

/** How many of the camp's creeps this stop leaves alive. */
export function creepsLeft(camp, kills) {
  const total = camp.creeps.reduce((sum, c) => sum + c.count, 0);
  return total - campKills(camp, kills).length;
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

/** Appends every creep not yet listed, row by row, so an author can set
 *  the first few kills and then finish the camp. */
export function addRestOfCamp(kills, counts) {
  let list = kills ?? [];
  counts.forEach((count, row) => {
    for (let i = 0; i < count; i++) list = addKill(list, row, counts);
  });
  return list;
}

/** For each creep row, the 1-based kill-order steps that name it, e.g.
 *  `[[2], [], [1]]` — the camp card's "Kill" column. */
export function killStepsByRow(camp, kills) {
  const steps = camp.creeps.map(() => []);
  kills.forEach(({ row }, i) => steps[row]?.push(i + 1));
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
