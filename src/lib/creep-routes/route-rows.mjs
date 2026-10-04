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
import { isWaypoint } from "./place.mjs";
import { MAX_PATHS } from "./caps.mjs";

/** The flat rows. `choice` maps an "or" split's key to the chosen arm (default 0). */
export function routeRows(stops, choice = {}) {
  const numbers = numberStops(stops, choice);
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

/**
 * The builder's rows (`RouteStepTable` with `editBody`): the same stop rows, but every path of a split
 * shows, one block per path in order: a heading row (`head`), the path's stops, then the next-stop row
 * (`slot`) when the next add lands in that path, else a quiet `add` row. A `sep` row stands between two
 * blocks, `more` ("Add a third path") after a pick-one split's last block, and the `after` row closes the
 * split; its lanes curve back into lane a when a stop or the next-stop row follows (`joins`; `follows`
 * counts stops only). `slot` is `{ index, label }` at the
 * top level or `{ index, arm, j, label }` in a path, or null. Rows inside a split carry `group` (the
 * split's key); an "and" split's stops carry `block`.
 *
 * Lines come from the marks each row puts on a lane (a node, a path's letter disc, the split's fork, the
 * join): a lane runs from its first mark to its last. Lane a is the main line and every path a; lanes b
 * and c belong to one split. A path's own lane is lit over its block, from its heading to its last mark:
 * `gold` where the next stop goes, `light` elsewhere; a line end is `true` when it is drawn plain.
 * @param {any[]} stops
 * @param {Record<string, number>} [choice]
 * @param {{ index: number, arm?: number, j?: number, label: string } | null} [slot]
 */
export function builderRows(stops, choice = {}, slot = null) {
  const numbers = numberStops(stops, choice);
  const rows = [];
  const lit = [];
  const isSlot = (i, arm) => slot !== null && slot.index === i && slot.arm === arm;
  const slotRow = (lane, mark, extra = {}) => ({ type: "slot", key: "slot", label: slot.label, lane, marks: [mark], ...extra });

  stops.forEach((stop, i) => {
    if (isSlot(i, undefined)) rows.push(slotRow("a", "a"));
    const n = numbers[i];
    const arms = armsOf(stop);
    if (!arms) {
      rows.push({ type: "stop", key: n.key, label: n.label, stop, lane: "a", marks: ["a"] });
      return;
    }
    const mode = stop.split.mode;
    const group = n.key;
    const ids = arms.map((_, a) => (a === 0 ? "a" : `${n.key}${ARM_LETTERS[a]}`));
    const lanes = arms.map((_, a) => ({ lane: ARM_LETTERS[a], off: false }));
    const joins = i < stops.length - 1 || isSlot(i + 1, undefined);
    rows.push({ type: "split", key: n.key, stop, index: i, mode, lanes, marks: ids });
    arms.forEach((arm, a) => {
      const lane = ARM_LETTERS[a];
      const here = isSlot(i, a);
      if (a > 0) rows.push({ type: "sep", key: `${n.key}.sep.${a}`, mode, group, marks: [] });
      const from = rows.length;
      const waypoints = arm.stops.filter(isWaypoint).length;
      const count = arm.stops.length - waypoints;
      rows.push({ type: "head", key: `${n.key}.head.${a}`, index: i, arm: a, lane, mode, here, count, waypoints, group, marks: [ids[a]] });
      const entries = [...arm.stops];
      if (here) entries.splice(slot.j, 0, null);
      let j = 0;
      for (const s of entries) {
        if (s === null) {
          rows.push(slotRow(lane, ids[a], { arm: a, group }));
          continue;
        }
        const { key, label } = n.arms[a].stops[j++];
        rows.push({ type: "stop", key, label, stop: s, lane, arm: a, node: i, group, marks: [ids[a]], ...(mode === "and" ? { block: n.key } : {}) });
      }
      lit.push({ id: ids[a], from, to: rows.length - 1, tone: here ? "gold" : "light" });
      if (!here) rows.push({ type: "add", key: `${n.key}.add.${a}`, index: i, arm: a, lane, mode, length: arm.stops.length, group, marks: [] });
    });
    if (mode !== "and" && arms.length < MAX_PATHS) rows.push({ type: "more", key: `${n.key}.more`, index: i, marks: [] });
    rows.push({ type: "after", key: `${n.key}.after`, index: i, mode, lanes, joins, follows: i < stops.length - 1, slotAfter: isSlot(i + 1, undefined), marks: joins ? ids : [] });
  });
  if (isSlot(stops.length, undefined)) rows.push(slotRow("a", "a"));

  const spans = new Map();
  rows.forEach((r, k) => r.marks.forEach((id) => spans.set(id, { first: spans.get(id)?.first ?? k, last: k })));
  const tone = (id, k, top) => lit.find((b) => b.id === id && (top ? k > b.from && k <= b.to : k >= b.from && k < b.to))?.tone ?? true;
  return rows.map((row, k) => ({
    ...row,
    lines: [...spans]
      .filter(([, s]) => s.first < s.last && k >= s.first && k <= s.last)
      .map(([id, s]) => ({ lane: id.at(-1), top: k > s.first && tone(id, k, true), bottom: k < s.last && tone(id, k, false), off: false })),
  }));
}
