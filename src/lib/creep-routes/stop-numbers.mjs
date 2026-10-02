/**
 * Stop numbers and keys for a route with splits (`RouteStop.split`, one level
 * deep). Numbers count only numbered stops: a waypoint (`place.mjs`) takes no
 * number and never counts. Stops before a split number as before; the split
 * takes the next number N. An "or" / "xor" split numbers along the chosen path
 * (`choice`, path a by default): every path's stops read N a, N+1 a / N b, …,
 * and the stops after the split go on from the chosen path's last number with no
 * gap, so switching the tab renumbers the list and the map together. An "and"
 * split's paths all read N, N+1, … and the stop after it takes N + the longest
 * path. A static count (the route card, the JSON API) uses the first path. Keys
 * are strings and never change with the choice: "0", "1", … at the top level and
 * "2.a.0" for the first stop of split 2's path a. Plain JS so `node --test` runs
 * `stop-numbers.test.mjs` with no loader.
 */

import { isWaypoint } from "./place.mjs";

export const ARM_LETTERS = ["a", "b", "c"];

/** A split's arms; null for a plain stop. */
export function armsOf(stop) {
  return stop?.split?.arms ?? null;
}

/** A path's numbered stops (a waypoint does not count). */
const numbered = (arm) => (arm.stops ?? []).filter((s) => !isWaypoint(s)).length;

/** One entry per top-level stop: `{ key, label }`, plus `arms: [{ letter, stops: [{ key, label }] }]` on a node.
 *  `choice` maps an "or"/"xor" split's key to the chosen path (default 0).
 *  @param {{ split?: { mode: string, arms: { stops: unknown[] }[] } }[]} stops
 *  @param {Record<string, number>} [choice]
 *  @returns {{ key: string, label: string, arms?: { letter: string, stops: { key: string, label: string }[] }[] }[]} */
export function numberStops(stops, choice = {}) {
  let n = 1;
  return stops.map((stop, i) => {
    const key = String(i);
    // A waypoint (a place that is not an attack) takes no number.
    if (isWaypoint(stop)) return { key, label: "" };
    const label = String(n);
    const nodeArms = armsOf(stop);
    if (!nodeArms) {
      n += 1;
      return { key, label };
    }
    // An "or" / "xor" split's arms read N a, N+1 a / N b; an "and" split's arms all read N, N+1.
    const and = stop.split.mode === "and";
    const suffix = (a) => (and ? "" : ARM_LETTERS[a]);
    const arms = nodeArms.map((arm, a) => {
      let j = 0;
      return {
        letter: ARM_LETTERS[a],
        stops: arm.stops.map((s, k) => ({ key: armKey(i, a, k), label: isWaypoint(s) ? "" : `${n + j++}${suffix(a)}` })),
      };
    });
    // The next stop goes on from the chosen path ("or"/"xor") or the longest path ("and").
    n += and ? Math.max(0, ...nodeArms.map(numbered)) : numbered(nodeArms[walkedArm(stop, key, choice)]);
    return { key, label, arms };
  });
}

export function armKey(index, arm, j) {
  return `${index}.${ARM_LETTERS[arm]}.${j}`;
}

/** `{ index, arm, j }` for an arm key, `{ index }` for a top-level key. */
export function parseKey(key) {
  const [index, letter, j] = String(key).split(".");
  return letter === undefined ? { index: Number(index) } : { index: Number(index), arm: ARM_LETTERS.indexOf(letter), j: Number(j) };
}

/** Every stop with its key and label (numbered along `choice`), in reading order: a node, then its arms' stops. */
export function flatStops(stops, choice = {}) {
  const numbers = numberStops(stops, choice);
  return stops.flatMap((stop, i) => [
    { key: numbers[i].key, label: numbers[i].label, stop },
    ...(armsOf(stop) ?? []).flatMap((arm, a) =>
      arm.stops.map((s, j) => ({ key: numbers[i].arms[a].stops[j].key, label: numbers[i].arms[a].stops[j].label, stop: s })),
    ),
  ]);
}

/** `flatStops` without the paths not chosen in an "or"/"xor" split: what the map draws. */
export function shownStops(stops, choice = {}) {
  return flatStops(stops, choice).filter(({ key }) => {
    const [index, letter] = String(key).split(".");
    if (letter === undefined) return true;
    const stop = stops[Number(index)];
    return walkedArm(stop, index, choice) === ARM_LETTERS.indexOf(letter) || stop.split.mode === "and";
  });
}

/** The keys whose map badge is not drawn: a camp that a split's drawn paths visit more than
 *  once keeps one badge, the active path's stop (in "and", the first path that has it). */
export function hiddenBadgeKeys(stops, choice = {}) {
  const seen = new Map();
  const hidden = new Set();
  for (const { key, stop } of shownStops(stops, choice)) {
    const [index, letter] = String(key).split(".");
    if (letter === undefined || !stop.campId) continue;
    const id = `${index}:${stop.campId}`;
    if (seen.has(id)) hidden.add(key);
    else seen.set(id, key);
  }
  return hidden;
}

/** Every key, in reading order (the stop list's "Expand all"). */
export function stopKeys(stops) {
  return flatStops(stops).map((s) => s.key);
}

/** How many numbered stops a reader of the route sees: every stop but a waypoint and a split; an "and"
 *  split counts every path's stops, an "or"/"xor" split only the chosen path's (`choice`, default the
 *  first path, which a static count such as the route card uses). Takes Sanity's `creepSplit` array
 *  members (`arms` on the item) as well as split nodes.
 *  @param {{ split?: { mode?: string, arms: { stops?: unknown[] }[] }, _type?: string, mode?: string, arms?: { stops?: unknown[] }[] }[]} stops
 *  @param {Record<string, number>} [choice] */
export function countStops(stops, choice = {}) {
  return (stops ?? []).reduce((n, s, i) => {
    const arms = armsOf(s) ?? (s._type === "creepSplit" ? s.arms ?? [] : null);
    if (!arms) return n + (isWaypoint(s) ? 0 : 1);
    const mode = s.split?.mode ?? s.mode;
    if (mode === "and") return n + arms.reduce((m, arm) => m + numbered(arm), 0);
    const walked = Math.min(Math.max(0, choice[String(i)] ?? 0), arms.length - 1);
    return n + (arms[walked] ? numbered(arms[walked]) : 0);
  }, 0);
}

/** The highest stop number any reading of the route reaches: every "or"/"xor" split read along its
 *  longest path (the cap of 12 numbered stops). */
export function longestCount(stops) {
  return (stops ?? []).reduce((n, s) => {
    const arms = armsOf(s) ?? (s._type === "creepSplit" ? s.arms ?? [] : null);
    if (!arms) return n + (isWaypoint(s) ? 0 : 1);
    const mode = s.split?.mode ?? s.mode;
    return n + (mode === "and" ? arms.reduce((m, arm) => m + numbered(arm), 0) : Math.max(0, ...arms.map(numbered)));
  }, 0);
}

/** The arm the hero walks at split `stop` (top-level key `key`): the chosen one of an "or" / "xor" split, arm 0 of an "and" split. */
export function walkedArm(stop, key, choice = {}) {
  return stop.split.mode === "and" ? 0 : Math.min(Math.max(0, choice[key] ?? 0), stop.split.arms.length - 1);
}

/** The key of the stop a map click on `campId` means: the top level and the walked arm of
 *  each node first, then any other arm.
 *  @returns {string | null} */
export function findStopKey(stops, campId, choice = {}) {
  const numbers = numberStops(stops);
  let fallback = null;
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const arms = armsOf(s);
    if (!arms) {
      if (s.campId === campId) return numbers[i].key;
      continue;
    }
    const walked = walkedArm(s, numbers[i].key, choice);
    for (let a = 0; a < arms.length; a++) {
      const j = arms[a].stops.findIndex((x) => x.campId === campId);
      if (j === -1) continue;
      const key = numbers[i].arms[a].stops[j].key;
      if (a === walked) return key;
      fallback ??= key;
    }
  }
  return fallback;
}

/** The stop a key names, or undefined. */
export function stopByKey(stops, key) {
  const { index, arm, j } = parseKey(key);
  return arm === undefined ? stops[index] : armsOf(stops[index])?.[arm]?.stops[j];
}
