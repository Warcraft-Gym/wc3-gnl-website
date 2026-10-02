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
