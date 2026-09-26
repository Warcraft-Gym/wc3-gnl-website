/** Groups results (already newest-first) into years, newest year first.
 *
 * Kept pure and separate from the page so the grouping is testable: an
 * off-by-one here would silently file a January event under the wrong year,
 * which nobody would notice by eye in a list of 156.
 */
export function groupByYear(results) {
  if (!Array.isArray(results)) return [];
  const years = new Map();
  for (const r of results) {
    const year = typeof r?.date === "string" ? r.date.slice(0, 4) : null;
    if (!year || !/^\d{4}$/.test(year)) continue;
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(r);
  }
  return [...years.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, items]) => ({
      year,
      results: items,
      crownings: items.reduce((n, r) => n + (r.winners?.length ?? 0), 0),
    }));
}

/** Day and month, e.g. "10 Jan". The year is the group heading. */
export function shortDate(iso) {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return iso;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(t));
}
