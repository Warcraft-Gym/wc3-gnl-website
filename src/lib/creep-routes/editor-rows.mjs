/**
 * The route builder's row edits (v2.7), plain JS so `node --test` runs `editor-rows.test.mjs`.
 * A row is `StopRowData` (`StopEditBody.tsx`); a split row holds `split.arms[].stops`, rows
 * themselves; splits are one level deep. A place in the list is `{ index }` at the top level or
 * `{ splitId, arm, index }` in a path. Principle: the builder never shows a state the model cannot
 * hold, so every move has one rule. Typed in `stop-rows.ts`.
 */
import { flatStops } from "./stop-numbers.mjs";

/** A new id for an editor row, path or Bring entry, unique in this page; never saved. */
let lastId = 0;
export const newId = () => ++lastId;

/** A fresh editor row; `patch` sets the camp, the place or the fork. */
export function newRow(patch = {}) {
  return { id: newId(), campId: null, action: "", units: [], note: "", condition: "", kills: [], leaveRest: false, ...patch };
}

/** The kinds of a paths block, in order: "Choose one path" first, a new block's kind. Whether chosen paths rejoin
 *  is read from the structure on save (`savedMode`), so the builder stores "or" for both. */
export const SPLIT_MODES = [
  { id: "or", label: "Choose one path" },
  { id: "and", label: "Take all paths simultaneously" },
];

/** A new split row: empty paths with these labels (two by default) in the first chip's mode by default. */
export function newSplitRow(mode = SPLIT_MODES[0].id, labels = ["", ""]) {
  return newRow({ split: { mode, arms: labels.map((label) => ({ id: newId(), label: label.trim(), stops: [] })) } });
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

/** The builder's target, where the next add lands: the route (no `splitId`) or path `arm` of the block
 *  `splitId`, and `pos`, null for the end of that list or an index in it. Opening a stop never moves it. */
export const ROUTE_END = { pos: null };

/** The place a target names; a target whose path is gone is the end of the route. */
export function targetPlace(rows, target) {
  const t = target ?? ROUTE_END;
  if (t.splitId === undefined) return { index: t.pos === null ? rows.length : Math.min(t.pos, rows.length) };
  const list = rows.find((r) => r.id === t.splitId)?.split?.arms[t.arm]?.stops;
  if (!list) return { index: rows.length };
  return { splitId: t.splitId, arm: t.arm, index: t.pos === null ? list.length : Math.min(t.pos, list.length) };
}

/** True when the target's list exists: the route, or a path still in its block. */
export function targetExists(rows, target) {
  if (target.splitId === undefined) return true;
  return target.arm < (rows.find((r) => r.id === target.splitId)?.split?.arms.length ?? 0);
}

/** The first submit error (its key, "stops.2.note") the builder can open, in the keys' order: a stop's
 *  field as `{ key }` ("2", "2.b.1"), or a path's name or emptiness as `{ index, arm }`; null for none. */
export function firstErrorAt(keys) {
  for (const k of keys) {
    const stop = /^stops\.(\d+)(?:\.split\.arms\.(\d+)\.stops\.(\d+))?\.(?!split\b)/.exec(k);
    if (stop) return { key: stop[2] === undefined ? stop[1] : `${stop[1]}.${"abc"[Number(stop[2])]}.${stop[3]}` };
    const path = /^stops\.(\d+)\.split\.arms\.(\d+)\.(?:label|stops)$/.exec(k);
    if (path) return { index: Number(path[1]), arm: Number(path[2]) };
  }
  return null;
}

/** The target after an add at it: the end stays the end; a place in the middle moves past the new row. */
export function targetAfterAdd(target) {
  return target.pos === null ? target : { ...target, pos: target.pos + 1 };
}

/** The target after removing path `arm` of block `splitId`: the route when it held that path or the
 *  block turns into plain stops; a later path of a block that stays shifts down one. */
export function targetAfterRemovePath(rows, target, splitId, arm) {
  if (target.splitId !== splitId) return target;
  const paths = rows.find((r) => r.id === splitId)?.split?.arms.length ?? 0;
  if (target.arm === arm || paths <= 2) return ROUTE_END;
  return target.arm > arm ? { ...target, arm: target.arm - 1 } : target;
}

/** The add line at `at` (`targetPlace`): the label the next numbered stop takes there, counting itself in
 *  (`stop-numbers.mjs`; the rows below keep their own numbers), and `after`, the row before the place
 *  ("after stop 2", "at the start", "at the start of path B"). `tabs`: the shown path by block id. */
export function nextStop(rows, at, tabs = {}) {
  const withSlot = insertAt(rows, at, { id: -1, campId: "slot" });
  const choice = Object.fromEntries(withSlot.flatMap((r, i) => (r.split ? [[String(i), tabs[r.id] ?? 0]] : [])));
  const labels = new Map(flatStops(withSlot, choice).map((s) => [s.key, s.label]));
  const labelOf = (id) => labels.get(keyOfRow(withSlot, id)) ?? "";
  const label = labelOf(-1);
  if (at.splitId !== undefined) {
    const split = rows.find((r) => r.id === at.splitId).split;
    const prev = split.arms[at.arm]?.stops[at.index - 1];
    const after = !prev ? `at the start of path ${split.mode === "and" ? at.arm + 1 : "ABC"[at.arm]}` : labelOf(prev.id) ? `after stop ${labelOf(prev.id)}` : "after the waypoint";
    return { label, after };
  }
  const prev = rows[at.index - 1];
  const after = !prev ? "at the start" : prev.split ? "after the paths" : labelOf(prev.id) ? `after stop ${labelOf(prev.id)}` : "after the waypoint";
  return { label, after };
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

/** Where an arrow moves row `id` (-1 up, 1 down), for `moveRowTo`, so arrows and drag share one rule.
 *  The arrows walk what is on screen: one place in its own list. In a "Choose one path" block only the
 *  shown path (`shown`: tab by block id, path A by default) is on screen: from its first stop up to just
 *  above the block, from its last stop down to just below it, and a stop from the route enters the shown
 *  path at the near end. A "Take all paths simultaneously" block shows every path stacked: from a path's
 *  first stop up to the end of the path above (from path 1: just above the block), from its last stop
 *  down to the start of the path below (from the last path: just below the block); from the route into
 *  its first path from above, its last path from below. A block swaps with its neighbour as one block.
 *  Null at either end of the route. */
export function stepTarget(rows, id, dir, shown = {}) {
  const from = locate(rows, id);
  if (!from) return null;
  const list = listAt(rows, from);
  const j = from.index + dir;
  if (from.splitId !== undefined) {
    if (j >= 0 && j < list.length) return { ...from, index: dir < 0 ? j : j + 1 };
    const s = rows.findIndex((r) => r.id === from.splitId);
    const { arms, mode } = rows[s].split;
    const k = from.arm + dir;
    if (mode === "and" && k >= 0 && k < arms.length) return { splitId: from.splitId, arm: k, index: dir < 0 ? arms[k].stops.length : 0 };
    return { index: dir < 0 ? s : s + 1 };
  }
  const next = rows[j];
  if (!next) return null;
  if (next.split && !list[from.index].split) {
    const { arms, mode } = next.split;
    const arm = mode === "and" ? (dir < 0 ? arms.length - 1 : 0) : Math.min(shown[next.id] ?? 0, arms.length - 1);
    return { splitId: next.id, arm, index: dir < 0 ? arms[arm].stops.length : 0 };
  }
  return { index: dir < 0 ? j : j + 1 };
}

/** The arrow's accessible name: "Move into path B" when it enters a path ("path 2" in a "Take all paths
 *  simultaneously" block), "Move out of the paths" when it leaves one, else "Move up" or "Move down". */
export function stepName(rows, id, dir, shown = {}) {
  const from = locate(rows, id);
  const to = stepTarget(rows, id, dir, shown);
  if (from && to && from.splitId !== undefined && to.splitId === undefined) return "Move out of the paths";
  if (from && to && to.splitId !== undefined && (from.splitId !== to.splitId || from.arm !== to.arm)) {
    const and = rows.find((r) => r.id === to.splitId)?.split?.mode === "and";
    return `Move into path ${and ? to.arm + 1 : "ABC"[to.arm]}`;
  }
  return dir < 0 ? "Move up" : "Move down";
}

/** Where a drop lands, from the zone under the pointer: a stop row (`row`, its key "3" or "2.a.1")
 *  before or `after` it; a split's `caption` (its index, `arm` the shown path) before the split, or
 *  after it into the shown path (a dragged split goes after the whole block instead); a `path` (the
 *  split's index and `arm`, at its position `at`, 0 by default); the list's `end`. Null where the dragged row cannot go:
 *  a split into a path (no drop zone lights up), or a split onto its own caption. */
export function dropTarget(rows, zone, dragged) {
  let at;
  if (zone.kind === "end") at = { index: rows.length };
  else if (zone.kind === "path") at = { splitId: rows[zone.index]?.id, arm: zone.arm, index: zone.at ?? 0 };
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
export const SAME_CAMP_LINE = "Paths are for different places. For another action at one camp, use one stop and say so in the note.";

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

/** The stack with `rows` (the list before a change), its `label` and the builder's selection then (`sel`)
 *  on top, at most `UNDO_CAP` deep. */
export function pushUndo(stack, rows, label, sel = null) {
  return [...stack, { rows, label, sel }].slice(-UNDO_CAP);
}

/** The top entry and the stack without it; null when there is nothing to undo. */
export function popUndo(stack) {
  return stack.length ? { entry: stack[stack.length - 1], stack: stack.slice(0, -1) } : null;
}
