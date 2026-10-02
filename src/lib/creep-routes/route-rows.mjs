/**
 * The stop list as flat rows with the lane rail (`RouteStepTable`). Every stop
 * is one row in route order; a linear route is one lane through every row. A
 * split's stops sit between its caption row and, when stops follow it, a join
 * row; the stops after a split
 * are shared by every way. Arms interleave a[0], b[0], a[1], b[1], …. An "and"
 * split shows every arm; an "or" split shows every arm and marks the ways not
 * chosen `off` (the list dims them); an "xor" split lists only the chosen way
 * (nothing follows it). Plain JS so `node --test` runs `route-rows.test.mjs`
 * with no loader.
 *
 * Each row carries `lines`, the rail's lane lines through it: lane "a" is the
 * main line (x 14), "b" and "c" the other arms. `top`/`bottom` say whether the
 * line runs above and below the row's node; with nothing after the split, an
 * arm's line stops at its last node.
 */
import { ARM_LETTERS, armsOf, numberStops, walkedArm } from "./stop-numbers.mjs";

/** The flat rows. `choice` maps an "or" split's key to the chosen arm (default 0). */
export function routeRows(stops, choice = {}) {
  const numbers = numberStops(stops);
  const rows = [];
  const full = (lane, off = false) => ({ lane, top: true, bottom: true, off });

  stops.forEach((stop, i) => {
    const n = numbers[i];
    const arms = armsOf(stop);
    if (!arms) {
      rows.push({ type: "stop", key: n.key, label: n.label, stop, lane: "", lines: [full("a")], off: false });
      return;
    }
    const mode = stop.split.mode;
    const walked = walkedArm(stop, n.key, choice);
    const follows = i < stops.length - 1;
    // The arms the list shows: only the chosen way of an "xor" split, every arm otherwise;
    // in an "or" split the ways not chosen are off.
    const shown = mode === "xor" ? [walked] : arms.map((_, a) => a);
    const off = (a) => mode === "or" && a !== walked;
    const laneOf = (a) => ({ lane: ARM_LETTERS[a], off: off(a) });
    rows.push({ type: "split", key: n.key, label: n.label, stop, index: i, mode, lanes: shown.map(laneOf), lines: [full("a")] });

    const depth = Math.max(...shown.map((a) => arms[a].stops.length));
    for (let j = 0; j < depth; j++) {
      for (const a of shown) {
        const s = arms[a].stops[j];
        if (!s) continue;
        // Lane b's line runs from the split to the join; with nothing after the split it stops at b's last node.
        const lines = shown.flatMap((b) => {
          const last = arms[b].stops.length - 1;
          if (b === a) return [{ lane: ARM_LETTERS[b], top: true, bottom: follows || j < last, off: off(b) }];
          const before = j < last || (j === last && a < b);
          return follows || before ? [full(ARM_LETTERS[b], off(b))] : [];
        });
        rows.push({ type: "stop", key: n.arms[a].stops[j].key, label: n.arms[a].stops[j].label, stop: s, lane: ARM_LETTERS[a], arm: a, node: i, lines, off: off(a) });
      }
    }

    // The join row curves the lanes back into the main line before the first shared stop.
    if (follows) rows.push({ type: "join", key: `${n.key}.join`, index: i, lanes: shown.map(laneOf), lines: [full("a")] });
  });

  // The rail starts at the first row's node and stops at the last row's.
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (first) first.lines = first.lines.map((l) => (l.lane === "a" ? { ...l, top: false } : l));
  if (last && last.type === "stop") last.lines = last.lines.map((l) => (l.lane === (last.lane || "a") ? { ...l, bottom: false } : l));
  return rows;
}
