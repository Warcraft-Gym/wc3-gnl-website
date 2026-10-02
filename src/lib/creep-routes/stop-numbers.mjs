/**
 * Stop numbers and keys for a route with splits (`RouteStop.split`, one level
 * deep). Stops before a split number as before; the split takes the next
 * number N; an "or" / "xor" split's arm stops read N a, N+1 a, … and N b, …; an "and"
 * split's arms all read N, N+1, …; the stop after the split takes N + the
 * longest arm's length. A waypoint (`place.mjs`) takes no
 * number and no length. Keys are strings: "0", "1", …
 * at the top level and "2.a.0" for the first stop of split 2's arm a. Plain
 * JS so `node --test` runs `stop-numbers.test.mjs` with no loader.
 */

import { isWaypoint } from "./place.mjs";

export const ARM_LETTERS = ["a", "b", "c"];

/** A split's arms; null for a plain stop. */
export function armsOf(stop) {
  return stop?.split?.arms ?? null;
}

/** One entry per top-level stop: `{ key, label }`, plus `arms: [{ letter, stops: [{ key, label }] }]` on a node.
 *  @param {{ split?: { mode: string, arms: { stops: unknown[] }[] } }[]} stops
 *  @returns {{ key: string, label: string, arms?: { letter: string, stops: { key: string, label: string }[] }[] }[]} */
export function numberStops(stops) {
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
    const suffix = (a) => (stop.split.mode === "and" ? "" : ARM_LETTERS[a]);
    const arms = nodeArms.map((arm, a) => {
      let j = 0;
      return {
        letter: ARM_LETTERS[a],
        stops: arm.stops.map((s, k) => ({ key: armKey(i, a, k), label: isWaypoint(s) ? "" : `${n + j++}${suffix(a)}` })),
      };
    });
    n += Math.max(1, ...nodeArms.map((arm) => arm.stops.filter((s) => !isWaypoint(s)).length));
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

/** Every stop with its key and label, in reading order: a node, then its arms' stops. */
export function flatStops(stops) {
  const numbers = numberStops(stops);
  return stops.flatMap((stop, i) => [
    { key: numbers[i].key, label: numbers[i].label, stop },
    ...(armsOf(stop) ?? []).flatMap((arm, a) =>
      arm.stops.map((s, j) => ({ key: numbers[i].arms[a].stops[j].key, label: numbers[i].arms[a].stops[j].label, stop: s })),
    ),
  ]);
}

/** Every key, in reading order (the stop list's "Expand all"). */
export function stopKeys(stops) {
  return flatStops(stops).map((s) => s.key);
}

/** How many numbered stops a route has: every stop but a waypoint and a split, arm stops included.
 *  Takes Sanity's `creepSplit` array members (`arms` on the item) as well as split nodes.
 *  @param {{ split?: { arms: { stops?: unknown[] }[] }, _type?: string, arms?: { stops?: unknown[] }[] }[]} stops */
export function countStops(stops) {
  return (stops ?? []).reduce((n, s) => {
    const arms = armsOf(s) ?? (s._type === "creepSplit" ? s.arms ?? [] : null);
    if (arms) return n + arms.reduce((m, arm) => m + (arm.stops ?? []).filter((x) => !isWaypoint(x)).length, 0);
    return n + (isWaypoint(s) ? 0 : 1);
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
