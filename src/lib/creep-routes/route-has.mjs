/**
 * Whether a route shows a feature, so a guide only embeds a route that has what its section
 * explains. Looks inside split paths too. Plain JS so `node --test` runs `route-has.test.mjs`.
 */
import { isPin, isWaypoint } from "./place.mjs";
import { flatStops } from "./stop-numbers.mjs";

/** `feature`: "split" (an "or" / "xor" split), "and" (an "and" split), "waypoint", "pin" or "attack".
 *  @param {{ stops: { split?: { mode: string }, place?: { kind: string } }[] }} route
 *  @param {"split" | "and" | "waypoint" | "pin" | "attack"} feature */
export function routeHas(route, feature) {
  return flatStops(route.stops).some(({ stop }) => {
    if (feature === "split") return stop.split?.mode === "or" || stop.split?.mode === "xor";
    if (feature === "and") return stop.split?.mode === "and";
    if (feature === "waypoint") return isWaypoint(stop);
    if (feature === "pin") return isPin(stop);
    return stop.place?.kind === "attack";
  });
}
