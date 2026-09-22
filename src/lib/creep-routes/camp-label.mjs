/**
 * Human-readable camp labels for reader-facing UI — a camp id like "c09"
 * means nothing to a coach reading a route; these read the actual creeps.
 * See DESIGN.md §Creep routes' "Table anatomy" and docs/creep-routes.md's
 * "Camp label rule". Camp ids stay in `data-camp` and `aria-label`s (those
 * are tooling, not reader-facing text) — only visible copy goes through
 * these helpers.
 */

/** "<highest-level creep's name>" + " +N" when the camp has more creeps
 *  than that one, e.g. a 3-creep camp reads "Giant Skeleton Warrior +2".
 *  A level tie keeps the first creep in `camp.creeps`' own order (the
 *  data's own placement order — the array is never re-sorted for display),
 *  not alphabetical. `+N` counts *bodies* past the first, so three copies
 *  of the same creep still read "+2". */
export function campLabel(camp) {
  const creeps = camp?.creeps ?? [];
  if (!creeps.length) return camp?.id ?? "Camp";
  const highest = creeps.reduce((best, c) => (c.level > best.level ? c : best), creeps[0]);
  const total = creeps.reduce((sum, c) => sum + c.count, 0);
  const extra = total - 1;
  return extra > 0 ? `${highest.name} +${extra}` : highest.name;
}

/** "1× Giant Skeleton Warrior · 1× Sludge Flinger · 1× Skeleton Archer" —
 *  every creep in the camp, in the data's own order, count×name. Empty
 *  string for a camp with no creeps (never happens for a real catalogue
 *  camp, but this never throws). */
export function campComposition(camp) {
  const creeps = camp?.creeps ?? [];
  return creeps.map((c) => `${c.count}× ${c.name}`).join(" · ");
}
