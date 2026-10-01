/** Which routes to offer at the bottom of a route page.
 *
 * Same race only, the way a build page offers "More Human builds": a Night
 * Elf player reading a Night Elf route has no use for an Orc one. Within the
 * race, routes on the *same map* come first — "how else do people creep this
 * map" — then the race's routes on other maps as filler, so a map's own
 * alternatives are never crowded out.
 */

import { featuredFirst } from "./filter.mjs";

export const RELATED_LIMIT = 6;

export function relatedRoutes(route, allRoutes, limit = RELATED_LIMIT) {
  const sameRace = allRoutes.filter((r) => r.slug !== route.slug && r.race === route.race);
  const sameMap = sameRace.filter((r) => r.map.slug === route.map.slug);
  const elsewhere = sameRace.filter((r) => r.map.slug !== route.map.slug);
  return [...sameMap, ...elsewhere].slice(0, limit);
}

/** Whether the heading can name the map — true only when every row is on it,
 *  so the heading never promises something the list does not deliver. */
export function allOnSameMap(route, related) {
  return related.length > 0 && related.every((r) => r.map.slug === route.map.slug);
}

/** The routes a guide offers under its example: up to `mapCount` routes on
 *  the example's map (other people's takes on it), then the route list's own
 *  top pick (`featuredFirst` over newest first) from any map, `limit` in
 *  all. `exclude` is the example route's own slug. */
export function guideRoutes(allRoutes, { mapSlug, exclude, mapCount = 2, limit = 3 }) {
  const pool = featuredFirst(allRoutes.filter((r) => r.slug !== exclude));
  const onMap = pool.filter((r) => r.map.slug === mapSlug).slice(0, mapCount);
  return [...onMap, ...pool.filter((r) => !onMap.includes(r))].slice(0, limit);
}
