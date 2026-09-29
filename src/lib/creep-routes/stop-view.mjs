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
 */

/** Start state: the first stop selected and open. */
export function initialStopView(count) {
  return count > 0 ? { selected: 0, open: new Set([0]) } : { selected: null, open: new Set() };
}

function withOpen(open, index) {
  return open.has(index) ? open : new Set(open).add(index);
}

export function stopViewReducer(state, action) {
  switch (action.type) {
    case "node":
      if (state.selected === action.index) return { ...state, selected: null };
      return { selected: action.index, open: withOpen(state.open, action.index) };
    case "summary":
      if (state.selected === action.index && state.open.has(action.index)) return state;
      return { selected: action.index, open: withOpen(state.open, action.index) };
    case "chevron": {
      const open = new Set(state.open);
      if (open.has(action.index)) open.delete(action.index);
      else open.add(action.index);
      return { ...state, open };
    }
    case "expandAll":
      return { ...state, open: new Set(Array.from({ length: action.count }, (_, i) => i)) };
    case "collapseAll":
      return { ...state, open: new Set() };
    case "deselect":
      return state.selected === null ? state : { ...state, selected: null };
    default:
      return state;
  }
}
