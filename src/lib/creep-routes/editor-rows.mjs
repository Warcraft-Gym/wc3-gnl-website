/**
 * The route builder's row edits (v2.7), plain JS so `node --test` runs `editor-rows.test.mjs`.
 * A row is `StopRowData` (`StopEditBody.tsx`); a split row holds `split.arms[].stops`, rows
 * themselves; splits are one level deep. A place in the list is `{ index }` at the top level or
 * `{ splitId, arm, index }` in a path. Principle: the builder never shows a state the model cannot
 * hold, so every move has one rule. Typed in `stop-rows.ts`.
 */
import { flatStops } from "./stop-numbers.mjs";

/** A fresh editor row; `patch` sets the camp, the place or the fork. */
export function newRow(patch = {}) {
  return { id: Date.now() + Math.random(), campId: null, action: "", units: [], note: "", condition: "", kills: [], leaveRest: false, ...patch };
}

/** The split mode chips, in order: "Choose a path" first, a new split's mode. Whether chosen paths rejoin
 *  is read from the structure on save (`savedMode`), so the builder stores "or" for both. */
export const SPLIT_MODES = [
  { id: "or", label: "Choose a path" },
  { id: "and", label: "At the same time" },
];

/** A new split row: two empty paths in the first chip's mode. */
export function newSplitRow() {
  return newRow({ split: { mode: SPLIT_MODES[0].id, arms: [0, 1].map((a) => ({ id: Date.now() + Math.random() + a, label: "", stops: [] })) } });
}

/** The mode a split saves: "and" stays; a chosen path is "or" when stops follow the split (the paths
 *  rejoin) and "xor" when nothing does (the paths end). */
export function savedMode(stops, index) {
  if (stops[index].split.mode === "and") return "and";
  return index < stops.length - 1 ? "or" : "xor";
}

/** Route stops with every split's mode read from the structure (`savedMode`). */
export function withSavedModes(stops) {
  return stops.map((s, i) => (s.split ? { ...s, split: { ...s.split, mode: savedMode(stops, i) } } : s));
}

/** Applies `update` to the stops of arm `arm` of the split row `splitId`. */
export function updateArm(rows, splitId, arm, update) {
  return rows.map((r) =>
    r.id === splitId && r.split
      ? { ...r, split: { ...r.split, arms: r.split.arms.map((a, i) => (i === arm ? { ...a, stops: update(a.stops) } : a)) } }
      : r,
  );
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

/** Where row `id` sits: `{ index }` at the top level, `{ splitId, arm, index }` in a path; null when absent. */
export function locate(rows, id) {
  for (const [i, r] of rows.entries()) {
    if (r.id === id) return { index: i };
    for (const [a, arm] of (r.split?.arms ?? []).entries()) {
      const j = arm.stops.findIndex((s) => s.id === id);
      if (j !== -1) return { splitId: r.id, arm: a, index: j };
    }
  }
  return null;
}

/** The list a place names: the top level, or a path's stops. */
export function listAt(rows, at) {
  return at.splitId === undefined ? rows : (rows.find((r) => r.id === at.splitId)?.split?.arms[at.arm]?.stops ?? []);
}

/** Inserts `row` at a place; a split only goes to the top level (one level stays one level). */
export function insertAt(rows, at, row) {
  if (at.splitId === undefined) return [...rows.slice(0, at.index), row, ...rows.slice(at.index)];
  if (row.split) return rows;
  return updateArm(rows, at.splitId, at.arm, (stops) => [...stops.slice(0, at.index), row, ...stops.slice(at.index)]);
}

/** Where an add goes (a map click, "+ Waypoint", "+ Split"): after the selected row in its own list;
 *  at the end of the active path `arm` when the selection is a split's caption; at the end with no
 *  selection. A split added from inside a split goes after that split. `selection`: `{ id, arm }`. */
export function addTarget(rows, selection, isSplit = false) {
  const where = selection ? locate(rows, selection.id) : null;
  if (!where) return { index: rows.length };
  if (where.splitId !== undefined) {
    return isSplit ? { index: rows.findIndex((r) => r.id === where.splitId) + 1 } : { splitId: where.splitId, arm: where.arm, index: where.index + 1 };
  }
  const row = rows[where.index];
  if (row.split && !isSplit) {
    const arm = Math.min(selection.arm ?? 0, row.split.arms.length - 1);
    return { splitId: row.id, arm, index: row.split.arms[arm].stops.length };
  }
  return { index: where.index + 1 };
}

/** The builder's next-stop row, the dashed row at `at` (`addTarget`'s place): the label the next numbered
 *  stop takes there, counting itself in (`stop-numbers.mjs`; the rows below keep their own numbers), the
 *  line under it, and `toEnd` when the row is not at the end ("Add at the end instead"). `after` names the
 *  row before a top-level place ("after stop 2", "at the start"). `tabs`: the shown path by split id. */
export function nextStop(rows, at, tabs = {}) {
  const withSlot = insertAt(rows, at, { id: -1, campId: "slot" });
  const choice = Object.fromEntries(withSlot.flatMap((r, i) => (r.split ? [[String(i), tabs[r.id] ?? 0]] : [])));
  const labels = new Map(flatStops(withSlot, choice).map((s) => [s.key, s.label]));
  const labelOf = (id) => labels.get(keyOfRow(withSlot, id)) ?? "";
  const label = labelOf(-1);
  if (at.splitId !== undefined) {
    const split = rows.find((r) => r.id === at.splitId).split;
    const name = split.arms[at.arm]?.label.trim();
    const path =
      split.mode === "and"
        ? `path ${at.arm + 1}, ${at.arm === 0 ? "the hero's" : "without the hero"}`
        : `path ${"ABC"[at.arm]}${name ? ` (${name})` : ""}`;
    return { label, line: `Adds stop ${label} to ${path}.`, toEnd: false };
  }
  const prev = rows[at.index - 1];
  const after = !prev ? "at the start" : prev.split ? "after the split" : labelOf(prev.id) ? `after stop ${labelOf(prev.id)}` : "after the waypoint";
  if (!rows.length) return { label, line: `Adds stop ${label}, your first stop.`, toEnd: false, after };
  if (at.index >= rows.length) return { label, line: `Adds stop ${label} at the end.`, toEnd: false, after };
  return { label, line: `Adds stop ${label} ${after}.`, toEnd: true, after };
}

/** Moves row `id` to place `at` (its index counted before the move). A split never goes into a path. */
export function moveRowTo(rows, id, at) {
  const from = locate(rows, id);
  if (!from) return rows;
  const row = listAt(rows, from)[from.index];
  if (row.split && at.splitId !== undefined) return rows;
  const same = from.splitId === at.splitId && from.arm === at.arm;
  const index = same && from.index < at.index ? at.index - 1 : at.index;
  if (same && index === from.index) return rows;
  return insertAt(removeRow(rows, id), { ...at, index }, row);
}

/** Where an arrow moves row `id` (-1 up, 1 down), for `moveRowTo`, so arrows and drag share one rule:
 *  one place in its own list; from a path's first stop up (last stop down) to just above (below) its
 *  split; from the main list onto a split, into its shown path (`shown`: tab by split id; path a in
 *  "and", where every path shows) at the near end. A split swaps with its neighbour as one block.
 *  Null at either end of the route. */
export function stepTarget(rows, id, dir, shown = {}) {
  const from = locate(rows, id);
  if (!from) return null;
  const list = listAt(rows, from);
  const j = from.index + dir;
  if (from.splitId !== undefined) {
    if (j >= 0 && j < list.length) return { ...from, index: dir < 0 ? j : j + 1 };
    const s = rows.findIndex((r) => r.id === from.splitId);
    return { index: dir < 0 ? s : s + 1 };
  }
  const next = rows[j];
  if (!next) return null;
  if (next.split && !list[from.index].split) {
    const arm = next.split.mode === "and" ? 0 : Math.min(shown[next.id] ?? 0, next.split.arms.length - 1);
    return { splitId: next.id, arm, index: dir < 0 ? next.split.arms[arm].stops.length : 0 };
  }
  return { index: dir < 0 ? j : j + 1 };
}

/** The arrow's accessible name: what the move does when it crosses a split's edge, else "Move up" or "Move down". */
export function stepName(rows, id, dir, shown = {}) {
  const from = locate(rows, id);
  const to = stepTarget(rows, id, dir, shown);
  if (from && to && from.splitId !== undefined && to.splitId === undefined) return "Move out of the split";
  if (from && to && from.splitId === undefined && to.splitId !== undefined) return `Move into path ${to.arm + 1}`;
  return dir < 0 ? "Move up" : "Move down";
}

/** Where a drop lands, from the zone under the pointer: a stop row (`row`, its key "3" or "2.a.1")
 *  before or `after` it; a split's `caption` (its index, `arm` the shown path) before the split, or
 *  after it into the shown path (a dragged split goes after the whole block instead); an empty
 *  `path` (the split's index and `arm`); the list's `end`. Null where the dragged row cannot go:
 *  a split into a path (no drop zone lights up), or a split onto its own caption. */
export function dropTarget(rows, zone, dragged) {
  let at;
  if (zone.kind === "end") at = { index: rows.length };
  else if (zone.kind === "path") at = { splitId: rows[zone.index]?.id, arm: zone.arm, index: 0 };
  else if (zone.kind === "caption") {
    if (dragged?.split && rows[zone.index]?.id === dragged.id) return null;
    if (!zone.after) at = { index: zone.index };
    else if (dragged?.split) at = { index: zone.index + 1 };
    else at = { splitId: rows[zone.index]?.id, arm: zone.arm ?? 0, index: 0 };
  } else {
    const [i, letter, j] = String(zone.key).split(".");
    at =
      letter === undefined
        ? { index: Number(i) + (zone.after ? 1 : 0) }
        : { splitId: rows[Number(i)]?.id, arm: "abc".indexOf(letter), index: Number(j) + (zone.after ? 1 : 0) };
  }
  if (dragged?.split && at.splitId !== undefined) return null;
  return at;
}

/** Removes path `arm` of split `splitId`. Removing the second-last path turns the split into plain
 *  stops: the remaining path's stops take its place, so no split ever has one path. */
export function removePath(rows, splitId, arm) {
  const i = rows.findIndex((r) => r.id === splitId);
  const split = rows[i]?.split;
  if (!split) return rows;
  const arms = split.arms.filter((_, a) => a !== arm);
  if (arms.length > 1) return rows.map((r, k) => (k === i ? { ...r, split: { ...split, arms } } : r));
  return [...rows.slice(0, i), ...(arms[0]?.stops ?? []), ...rows.slice(i + 1)];
}

/** Removes split `splitId`, keeping path `keep`'s stops in the main line and dropping the others. */
export function removeSplit(rows, splitId, keep = 0) {
  const i = rows.findIndex((r) => r.id === splitId);
  if (!rows[i]?.split) return rows;
  return [...rows.slice(0, i), ...(rows[i].split.arms[keep]?.stops ?? []), ...rows.slice(i + 1)];
}

/** The line under a split's chips (and in the submit check, not blocking) when every path is the same camps. */
export const SAME_CAMP_LINE = "A split is for different places. For another action at one camp, use one stop and say so in the note.";

/** True when every path of `split` visits the same camps in the same order (waypoints aside): a split
 *  for another action at one place. The same camps in another order are a real choice. */
export function sameCampSequence(split) {
  const seqs = (split?.arms ?? []).map((a) => a.stops.map((s) => s.campId).filter(Boolean).join(","));
  return seqs.length > 1 && seqs[0] !== "" && seqs.every((q) => q === seqs[0]);
}

/** Sets path `arm`'s label as typed, never trimmed while typing ("Contest " keeps its space for
 *  "Contest Elf"); `commit` (the field's blur) trims it once. */
export function setArmLabel(rows, splitId, arm, label, commit = false) {
  const value = commit ? label.trim() : label;
  return rows.map((r) =>
    r.id === splitId && r.split ? { ...r, split: { ...r.split, arms: r.split.arms.map((x, a) => (a === arm ? { ...x, label: value } : x)) } } : r,
  );
}

/** Undo: the stop list is one value, so undo is a stack of earlier lists with what changed; no redo. */
export const UNDO_CAP = 50;

/** The stack with `rows` (the list before a change) and its `label` on top, at most `UNDO_CAP` deep. */
export function pushUndo(stack, rows, label) {
  return [...stack, { rows, label }].slice(-UNDO_CAP);
}

/** The top entry and the stack without it; null when there is nothing to undo. */
export function popUndo(stack) {
  return stack.length ? { entry: stack[stack.length - 1], stack: stack.slice(0, -1) } : null;
}
