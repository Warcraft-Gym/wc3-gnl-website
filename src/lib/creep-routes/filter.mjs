/**
 * Pure creep-route list filtering, plain JS so `node --test` can check it
 * with no loader (see `filter.test.mjs`) — same split as
 * `derive.mjs`/`submission.mjs`. Factored out of `routes.ts` (a `.ts` file
 * `node --test` can't run directly — no type-stripping loader is wired up)
 * so this logic is directly testable (code-a.md, "Should fix": no tests
 * existed for it before). `routes.ts` re-exports the typed façade
 * `filter.ts`.
 */

/** `vsRace` matches a route written for that opponent (among others) or
 *  for any opponent (`"any"`, or an empty `vsRaces[]`); `map` matches the
 *  map slug; `q` matches title/summary/author/map name, case-insensitive. */
export function filterCreepRoutes(routes, f) {
  const q = f.q?.trim().toLowerCase();
  return routes.filter((r) => {
    if (f.race && r.race !== f.race) return false;
    if (f.vsRace && f.vsRace !== "any" && r.vsRaces.length && !r.vsRaces.includes(f.vsRace)) return false;
    if (f.map && r.map.slug !== f.map) return false;
    if (f.level && r.level !== f.level) return false;
    if (q) {
      const hay = [r.title, r.summary, r.author, r.map.name].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
