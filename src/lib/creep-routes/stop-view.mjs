/**
 * The route page's two pieces of stop state: `selected`, the one stop the
 * map pulses and the list marks with a gold dot, and `open`, the stops that
 * are expanded. Moves:
 * - `node` (a map marker): selects and opens that stop; on the stop already
 *   selected it deselects instead. Never closes a stop.
 * - `summary` (a stop's summary line): selects and opens that stop. Never
 *   closes or deselects.
 * - `chevron`: toggles that stop open or closed; selection unchanged.
 * - `expandAll` / `collapseAll`: every stop open / none; selection unchanged.
 * - `deselect` (Escape): nothing selected; open unchanged.
 *
 * A stop is named by `action.key` (the string keys of `stop-numbers.mjs`,
 * "0", "2.a.0") or, as before, by `action.index`. `node` and `summary` also
 * open the keys in `action.also` (the fork that holds an arm stop), and
 * `expandAll` opens `action.keys` when given, else indexes 0..count-1.
 */

/** Start state: the first stop selected and open. `first` is its id (index 0, or the key "0").
 *  @param {number} count
 *  @param {number | string} [first] */
export function initialStopView(count, first = 0) {
  return count > 0 ? { selected: first, open: new Set([first]) } : { selected: null, open: new Set() };
}

function withOpen(open, ids) {
  return ids.every((id) => open.has(id)) ? open : new Set([...open, ...ids]);
}

export function stopViewReducer(state, action) {
  const id = action.key ?? action.index;
  const also = action.also ?? [];
  switch (action.type) {
    case "node":
      if (state.selected === id) return { ...state, selected: null };
      return { selected: id, open: withOpen(state.open, [...also, id]) };
    case "summary":
      if (state.selected === id && state.open.has(id) && also.every((a) => state.open.has(a))) return state;
      return { selected: id, open: withOpen(state.open, [...also, id]) };
    case "chevron": {
      const open = new Set(state.open);
      if (open.has(id)) open.delete(id);
      else open.add(id);
      return { ...state, open };
    }
    case "expandAll":
      return { ...state, open: new Set(action.keys ?? Array.from({ length: action.count }, (_, i) => i)) };
    case "collapseAll":
      return { ...state, open: new Set() };
    case "deselect":
      return state.selected === null ? state : { ...state, selected: null };
    default:
      return state;
  }
}
