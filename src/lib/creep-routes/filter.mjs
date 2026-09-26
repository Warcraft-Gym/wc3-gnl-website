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

/** Floats the featured route to the front.
 *
 * The `featured` flag existed on `creepRoute` from the start and nothing read
 * it — `getFeaturedCreepRoute` was never called and the home page has no route
 * section — so a coach could tick "Route of the week" and watch nothing happen.
 * Its own Studio description promised "shown at the top of the route list",
 * which is what this makes true.
 *
 * Only on the default view: once a reader has filtered or chosen a sort, that
 * is a direct instruction and a pinned route jumping the queue would be a bug,
 * not a feature. If several routes are flagged (the description asks for one)
 * the first in the given order wins, and the rest keep their places.
 */
export function featuredFirst(routes, { apply = true } = {}) {
  if (!apply || !Array.isArray(routes)) return routes;
  const i = routes.findIndex((r) => r?.featured);
  if (i <= 0) return routes;
  return [routes[i], ...routes.slice(0, i), ...routes.slice(i + 1)];
}
