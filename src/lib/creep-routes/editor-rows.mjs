/**
 * The route builder's row edits that a map click makes, plain JS so `node --test`
 * runs `editor-rows.test.mjs`. A row is `StopRowData` (`StopRow.tsx`); a split row
 * holds `split.arms[].stops`, rows themselves. Typed in `stop-rows.ts`.
 */

/** A fresh editor row; `patch` sets the camp, the place or the fork. */
export function newRow(patch = {}) {
  return { id: Date.now() + Math.random(), campId: null, action: "", units: [], note: "", condition: "", kills: [], leaveRest: false, ...patch };
}

/** The split mode chips, in order: "Choose a path" first, the default of a new split. */
export const SPLIT_MODES = [
  { id: "xor", label: "Choose a path" },
  { id: "or", label: "Choose a path, then continue" },
  { id: "and", label: "At the same time" },
];

/** A new split row: two empty paths in the first chip's mode. */
export function newSplitRow() {
  return newRow({ split: { mode: SPLIT_MODES[0].id, arms: [0, 1].map((a) => ({ id: Date.now() + Math.random() + a, label: "", stops: [] })) } });
}

/** Adds a camp stop, or removes it when the list already has it (the map's click toggle). */
export function toggleCamp(rows, campId) {
  const idx = rows.findIndex((r) => r.campId === campId);
  return idx !== -1 ? rows.filter((_, i) => i !== idx) : [...rows, newRow({ campId })];
}

/** Applies `update` to the stops of arm `arm` of the split row `splitId`. */
export function updateArm(rows, splitId, arm, update) {
  return rows.map((r) =>
    r.id === splitId && r.split
      ? { ...r, split: { ...r.split, arms: r.split.arms.map((a, i) => (i === arm ? { ...a, stops: update(a.stops) } : a)) } }
      : r,
  );
}

/** A map click with no way active: a camp in any split way is removed from that way;
 *  otherwise the click toggles the camp at the top level. */
export function toggleCampAnywhere(rows, campId) {
  for (const r of rows) {
    const arm = r.split?.arms.findIndex((a) => a.stops.some((s) => s.campId === campId)) ?? -1;
    if (arm !== -1) return updateArm(rows, r.id, arm, (stops) => stops.filter((s) => s.campId !== campId));
  }
  return toggleCamp(rows, campId);
}

/** The stop-list key (`stop-numbers.mjs`: "2", "2.a.0") of the row `id`, top level or in a split's path; null when absent. */
export function keyOfRow(rows, id) {
  for (const [i, r] of rows.entries()) {
    if (r.id === id) return String(i);
    for (const [a, arm] of (r.split?.arms ?? []).entries()) {
      const j = arm.stops.findIndex((s) => s.id === id);
      if (j !== -1) return `${i}.${"abc"[a]}.${j}`;
    }
  }
  return null;
}

/** The row at a stop-list key, or undefined. */
export function rowAtKey(rows, key) {
  const [i, letter, j] = String(key).split(".");
  const row = rows[Number(i)];
  return letter === undefined ? row : row?.split?.arms["abc".indexOf(letter)]?.stops[Number(j)];
}

/** Applies `update` to the list (top level or a path's stops) that holds row `id`. */
function inListOf(rows, id, update) {
  if (rows.some((r) => r.id === id)) return update(rows);
  return rows.map((r) =>
    r.split && r.split.arms.some((a) => a.stops.some((s) => s.id === id))
      ? { ...r, split: { ...r.split, arms: r.split.arms.map((a) => (a.stops.some((s) => s.id === id) ? { ...a, stops: update(a.stops) } : a)) } }
      : r,
  );
}

/** Merges `patch` into row `id`, wherever it is. */
export function patchRow(rows, id, patch) {
  return inListOf(rows, id, (list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

/** Removes row `id`, wherever it is. */
export function removeRow(rows, id) {
  return inListOf(rows, id, (list) => list.filter((r) => r.id !== id));
}

/** Moves row `id` one place up (-1) or down (1) inside its own list. */
export function moveRow(rows, id, dir) {
  return inListOf(rows, id, (list) => {
    const i = list.findIndex((r) => r.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return list;
    const copy = [...list];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });
}

/** Where row `id` sits in its own list: `{ index, length }`. */
export function placeInList(rows, id) {
  let out = { index: -1, length: 0 };
  inListOf(rows, id, (list) => {
    out = { index: list.findIndex((r) => r.id === id), length: list.length };
    return list;
  });
  return out;
}
