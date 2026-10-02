/**
 * Stop numbers and keys for a route with forks (`RouteStop.fork`, one level
 * deep). Stops before a fork number as before; the fork node takes the next
 * number N; arm stops read N a, N+1 a, … and N b, N+1 b, …; the stop after
 * the fork takes N + the longest arm's length. Keys are strings: "0", "1", …
 * at the top level and "2.a.0" for the first stop of fork 2's arm a. Plain
 * JS so `node --test` runs `stop-numbers.test.mjs` with no loader.
 */

export const ARM_LETTERS = ["a", "b", "c"];

/** One entry per top-level stop: `{ key, label }`, plus `arms: [{ letter, stops: [{ key, label }] }]` on a fork.
 *  @param {{ fork?: { arms: { stops: unknown[] }[] } }[]} stops
 *  @returns {{ key: string, label: string, arms?: { letter: string, stops: { key: string, label: string }[] }[] }[]} */
export function numberStops(stops) {
  let n = 1;
  return stops.map((stop, i) => {
    const key = String(i);
    const label = String(n);
    if (!stop.fork) {
      n += 1;
      return { key, label };
    }
    const arms = stop.fork.arms.map((arm, a) => ({
      letter: ARM_LETTERS[a],
      stops: arm.stops.map((_, j) => ({ key: armKey(i, a, j), label: `${n + j}${ARM_LETTERS[a]}` })),
    }));
    n += Math.max(1, ...stop.fork.arms.map((arm) => arm.stops.length));
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

/** Every stop with its key and label, in reading order: a fork, then its arms' stops. */
export function flatStops(stops) {
  const numbers = numberStops(stops);
  return stops.flatMap((stop, i) => [
    { key: numbers[i].key, label: numbers[i].label, stop },
    ...(stop.fork?.arms ?? []).flatMap((arm, a) =>
      arm.stops.map((s, j) => ({ key: numbers[i].arms[a].stops[j].key, label: numbers[i].arms[a].stops[j].label, stop: s })),
    ),
  ]);
}

/** Every key, in reading order (the stop list's "Expand all"). */
export function stopKeys(stops) {
  return flatStops(stops).map((s) => s.key);
}

/** How many real stops a route has: every non-fork stop plus every arm's stops. Takes a
 *  Sanity `creepFork` array member (`arms` on the item) as well as a fork node (`fork.arms`).
 *  @param {{ fork?: { arms: { stops?: unknown[] }[] }, _type?: string, arms?: { stops?: unknown[] }[] }[]} stops */
export function countStops(stops) {
  return (stops ?? []).reduce((n, s) => {
    const arms = s.fork?.arms ?? (s._type === "creepFork" ? s.arms ?? [] : null);
    return n + (arms ? arms.reduce((m, arm) => m + (arm.stops?.length ?? 0), 0) : 1);
  }, 0);
}

/** The key of the stop a map click on `campId` means: the top level and the walked arm of
 *  each fork (the chosen one in "either", arm 0 in "both") first, then any other arm.
 *  @returns {string | null} */
export function findStopKey(stops, campId, choice = {}) {
  const numbers = numberStops(stops);
  let fallback = null;
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    if (!s.fork) {
      if (s.campId === campId) return numbers[i].key;
      continue;
    }
    const walked = s.fork.mode === "both" ? 0 : (choice[numbers[i].key] ?? 0);
    for (let a = 0; a < s.fork.arms.length; a++) {
      const j = s.fork.arms[a].stops.findIndex((x) => x.campId === campId);
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
  return arm === undefined ? stops[index] : stops[index]?.fork?.arms[arm]?.stops[j];
}
