/**
 * The stop list as flat rows with the lane rail (`RouteStepTable`). Every stop
 * is one row in route order; a linear route is one lane through every row. A
 * split adds its caption row, then the stops of the paths it lists as blocks
 * (path a's block, then b's, then c's), then, when stops follow it, a join
 * row; the stops after a split are shared by every path. An "and" split lists
 * every path. An "or" or "xor" split lists only the chosen path; the paths not
 * taken are `off`: a dashed lane with no rows, from the split row to the join
 * row ("or"), or a stub that ends in the split row (nothing follows "xor").
 * The chosen path's rows carry `panel`, the split's key (the tab panel). An
 * "and" split is one XP event: its rows carry `block` (the split's key) and it
 * always ends in a join row, which shows the block's XP. Plain JS so
 * `node --test` runs `route-rows.test.mjs` with no loader.
 *
 * Each row carries `lines`, the rail's lane lines through it: lane "a" is the
 * main line (x 14), "b" and "c" the other arms. `top`/`bottom` say whether the
 * line runs above and below the row's node; `off` draws it dashed. A later
 * path's line runs down past the earlier blocks to its own; an earlier path's
 * line runs on to the join, or, with nothing after the split, stops at its
 * last node.
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
      rows.push({ type: "stop", key: n.key, label: n.label, stop, lane: "", lines: [full("a")] });
      return;
    }
    const mode = stop.split.mode;
    const walked = walkedArm(stop, n.key, choice);
    // An "and" block always ends in its join row (the block's XP line), even when nothing follows.
    const follows = i < stops.length - 1 || mode === "and";
    // The paths the list shows: every arm of an "and" split, only the chosen one otherwise.
    const shown = mode === "and" ? arms.map((_, a) => a) : [walked];
    const off = (a) => !shown.includes(a);
    const lanes = arms.map((_, a) => ({ lane: ARM_LETTERS[a], off: off(a) }));
    rows.push({ type: "split", key: n.key, label: n.label, stop, index: i, mode, lanes, lines: [full("a")] });

    shown.forEach((a, k) => {
      const last = arms[a].stops.length - 1;
      arms[a].stops.forEach((s, j) => {
        // Paths after this block run past it; paths before it, and the dashed paths not taken, run on to the join.
        const lines = arms.flatMap((_, b) => {
          if (b === a) return [{ lane: ARM_LETTERS[b], top: true, bottom: follows || j < last, off: false }];
          return (shown.indexOf(b) > k || follows) ? [full(ARM_LETTERS[b], off(b))] : [];
        });
        const key = n.arms[a].stops[j].key;
        rows.push({ type: "stop", key, label: n.arms[a].stops[j].label, stop: s, lane: ARM_LETTERS[a], arm: a, node: i, lines, ...(mode === "and" ? { block: n.key } : { panel: n.key }) });
      });
    });

    // The join row curves the lanes back into the main line before the first shared stop.
    if (follows) rows.push({ type: "join", key: `${n.key}.join`, index: i, mode, lanes, lines: [full("a")] });
  });

  // The rail starts at the first row's node and stops at the last row's.
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (first) first.lines = first.lines.map((l) => (l.lane === "a" ? { ...l, top: false } : l));
  if (last && last.type === "stop") last.lines = last.lines.map((l) => (l.lane === (last.lane || "a") ? { ...l, bottom: false } : l));
  return rows;
}

/** An "and" block's join row: the level after the block and the XP it paid, "Lv 3 · +250 xp". */
export function joinXpLabel(node) {
  return `Lv ${node.levelAfter} · +${node.xpGained} xp`;
}
