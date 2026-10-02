/**
 * The stop list as flat rows for a route with a fork or parallel node (the
 * lane rail, `RouteStepTable`). Every stop is one row in route order: the
 * rows of a node's arms interleave a[0], b[0], a[1], b[1], …, between a
 * "split" row (the node's caption) and a "join" row (the rail merging back),
 * then the shared stops follow. Plain JS so `node --test` runs
 * `route-rows.test.mjs` with no loader.
 *
 * Each row carries `lines`, the rail's lane lines through it: lane "a" is the
 * main line (x 14), "b" and "c" the other arms. `top`/`bottom` say whether the
 * line runs above and below the row's node; an arm that `ends` stops at its
 * last node. `off` marks what is not on the chosen way's path: a fork's other
 * arms and, when the chosen way ends, everything after the node.
 */
import { ARM_LETTERS, armsOf, numberStops, walkedArm } from "./stop-numbers.mjs";

/** True when the route has a fork or parallel node, so the list draws the rail. */
export function hasLanes(stops) {
  return stops.some((s) => armsOf(s));
}

/** The flat rows. `choice` maps a fork key to the chosen arm (default 0). */
export function routeRows(stops, choice = {}) {
  const numbers = numberStops(stops);
  const rows = [];
  let offAfter = false;
  const main = () => ({ lane: "a", top: true, bottom: true, off: offAfter });

  stops.forEach((stop, i) => {
    const n = numbers[i];
    const arms = armsOf(stop);
    if (!arms) {
      rows.push({ type: "stop", key: n.key, label: n.label, stop, lane: "", lines: [main()], off: offAfter });
      return;
    }
    const fork = Boolean(stop.fork);
    const walked = walkedArm(stop, n.key, choice);
    const armOff = (a) => offAfter || (fork && a !== walked);
    const ends = (a) => fork && Boolean(arms[a].ends);
    rows.push({ type: "split", key: n.key, label: n.label, stop, index: i, kind: fork ? "fork" : "parallel", arms: arms.length, off: offAfter, lines: [main()] });

    const depth = Math.max(...arms.map((arm) => arm.stops.length));
    for (let j = 0; j < depth; j++) {
      arms.forEach((arm, a) => {
        const s = arm.stops[j];
        if (!s) return;
        // Lane b's line runs from the split down to the join, or, when b ends, to its last node.
        const lines = arms.flatMap((other, b) => {
          const last = other.stops.length - 1;
          if (b === a) return [{ lane: ARM_LETTERS[b], top: true, bottom: !(j === last && ends(b)), off: armOff(b) }];
          const before = j < last || (j === last && a < b);
          return !ends(b) || before ? [{ lane: ARM_LETTERS[b], top: true, bottom: true, off: armOff(b) }] : [];
        });
        rows.push({
          type: "stop",
          key: n.arms[a].stops[j].key,
          label: n.arms[a].stops[j].label,
          stop: s,
          lane: ARM_LETTERS[a],
          arm: a,
          node: i,
          lines,
          off: armOff(a),
        });
      });
    }

    const rejoin = arms.map((_, a) => a).filter((a) => !ends(a));
    if (fork && ends(walked)) offAfter = true;
    // A join row only when a lane other than the main one curves back in.
    if (rejoin.some((a) => a > 0)) {
      rows.push({
        type: "join",
        key: `${n.key}.join`,
        index: i,
        rejoin: rejoin.map((a) => ({ lane: ARM_LETTERS[a], off: armOff(a) })),
        off: offAfter,
        lines: [main()],
      });
    }
  });

  // The rail starts at the first row's node and stops at the last row's.
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (first) first.lines = first.lines.map((l) => (l.lane === "a" ? { ...l, top: false } : l));
  if (last && last.type !== "join") last.lines = last.lines.map((l) => (l.lane === "a" ? { ...l, bottom: false } : l));
  return rows;
}
