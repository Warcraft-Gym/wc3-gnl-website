/**
 * The route builder's row edits that a map click makes, plain JS so `node --test`
 * runs `editor-rows.test.mjs`. A row is `StopRowData` (`StopRow.tsx`); a split row
 * holds `split.arms[].stops`, rows themselves. Typed in `stop-rows.ts`.
 */

/** A fresh editor row; `patch` sets the camp, the place or the fork. */
export function newRow(patch = {}) {
  return { id: Date.now() + Math.random(), campId: null, action: "", units: [], note: "", condition: "", kills: [], leaveRest: false, ...patch };
}

/** Adds a camp stop, or removes it when the list already has it (the map's click toggle). */
export function toggleCamp(rows, campId) {
  const idx = rows.findIndex((r) => r.campId === campId);
  return idx !== -1 ? rows.filter((_, i) => i !== idx) : [...rows, newRow({ campId })];
}

/** Applies `update` to the stops of arm `arm` of the split row `splitId`. */
export function updateArm(rows, splitId, arm, update) {
  return rows.map((r) =>
    r.id === splitId && r.split
      ? { ...r, split: { ...r.split, arms: r.split.arms.map((a, i) => (i === arm ? { ...a, stops: update(a.stops) } : a)) } }
      : r,
  );
}

/** A map click with no way active: a camp in any split way is removed from that way;
 *  otherwise the click toggles the camp at the top level. */
export function toggleCampAnywhere(rows, campId) {
  for (const r of rows) {
    const arm = r.split?.arms.findIndex((a) => a.stops.some((s) => s.campId === campId)) ?? -1;
    if (arm !== -1) return updateArm(rows, r.id, arm, (stops) => stops.filter((s) => s.campId !== campId));
  }
  return toggleCamp(rows, campId);
}
