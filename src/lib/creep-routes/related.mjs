/** Which routes to offer at the bottom of a route page.
 *
 * Alternatives on the *same map* first, then same-race routes elsewhere as
 * filler. The comparison a reader wants is "how else do people creep this
 * map" — a different approach to Autumn Leaves is useful next to an Autumn
 * Leaves route in a way that an Orc route on another map is not.
 *
 * The rule this replaced was "same map OR same race", then take the first
 * three in update order, so a map with several routes could show none of
 * them: the filler could crowd out the thing the section is for.
 */

export const RELATED_LIMIT = 6;

export function relatedRoutes(route, allRoutes, limit = RELATED_LIMIT) {
  const others = allRoutes.filter((r) => r.slug !== route.slug);
  const sameMap = others.filter((r) => r.map.slug === route.map.slug);
  const sameRaceElsewhere = others.filter(
    (r) => r.map.slug !== route.map.slug && r.race === route.race,
  );
  return [...sameMap, ...sameRaceElsewhere].slice(0, limit);
}

/** Whether the heading can name the map — true only when every row is on it,
 *  so the heading never promises something the list does not deliver. */
export function allOnSameMap(route, related) {
  return related.length > 0 && related.every((r) => r.map.slug === route.map.slug);
}
