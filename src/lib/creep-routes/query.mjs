/**
 * Pure query-string → filter-params parsing for `/api/creep-routes` (see
 * `query.test.mjs`) — extracted so it's directly testable with
 * `node --test` (the API route itself is a `.ts` Next route handler, no
 * loader wired up to run those directly; code-a.md, "Should fix": no test
 * existed for the invalid-param-is-ignored behaviour before). An invalid
 * or unknown value for any param is silently ignored (undefined), never an
 * error — same UX as the list page's own URL params.
 */

/** `params` is a plain `{ race?, vs?, level?, map? }` of raw strings (the
 *  caller reads them off `URLSearchParams`); `catalogue` names every known
 *  id so an unrecognised value (e.g. `?race=elf`) drops rather than throws
 *  or passes through. */
export function parseRouteQuery(params, { raceIds, levelIds, mapSlugs }) {
  const raceSet = new Set(raceIds);
  const levelSet = new Set(levelIds);
  const mapSet = new Set(mapSlugs);
  return {
    race: params.race && raceSet.has(params.race) ? params.race : undefined,
    vsRace: params.vs && raceSet.has(params.vs) ? params.vs : undefined,
    level: params.level && levelSet.has(params.level) ? params.level : undefined,
    map: params.map && mapSet.has(params.map) ? params.map : undefined,
  };
}
