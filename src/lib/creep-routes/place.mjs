/**
 * Place stops: a stop at a start, a gold mine, a shop or a free point on the
 * map instead of a camp (`RouteStop.place`, see `types.ts`). Plain JS so
 * `node --test` runs `place.test.mjs` with no loader. A place is looked up on
 * the route's map, never authored with its own coordinates, except `point`.
 */
import { neutralIconFor } from "./neutral-icons.mjs";

export const PLACE_KINDS = ["start", "mine", "shop", "point"];

/** The place's position as image fractions (0..1), or null when its id is not on the map. */
export function placePoint(map, place) {
  if (!place) return null;
  if (place.kind === "point") return Number.isFinite(place.x) && Number.isFinite(place.y) ? { x: place.x, y: place.y } : null;
  if (place.kind === "start") return map.starts.find((s) => String(s.player) === place.id) ?? null;
  if (place.kind === "mine") return map.mines[Number(place.id)] ?? null;
  if (place.kind === "shop") return map.shops.find((s) => s.id === place.id) ?? null;
  return null;
}

/** The muted place name in the stop list: "their base", "a gold mine", the shop's name, "on the map".
 *  `youStart` is the route's own start index (`CreepRoute.start`), so your own base reads "your base". */
export function placeName(map, place, youStart = 0) {
  if (place.kind === "start") {
    const i = map.starts.findIndex((s) => String(s.player) === place.id);
    return i === youStart ? "your base" : "their base";
  }
  if (place.kind === "mine") return "a gold mine";
  if (place.kind === "shop") return neutralIconFor(place.id)?.label ?? "shop";
  return "on the map";
}

/** Why `place` cannot stand on a map described by `{ startIds, mineCount, shopIds }`, or null.
 *  Each list is optional; an unknown one skips its check. */
export function placeProblem(place, { startIds, mineCount, shopIds } = {}) {
  if (place.kind === "start" && startIds && !startIds.includes(place.id)) return `Unknown start "${place.id}" on this map`;
  if (place.kind === "mine" && mineCount !== undefined && !(Number.isInteger(Number(place.id)) && Number(place.id) >= 0 && Number(place.id) < mineCount)) {
    return `Unknown gold mine "${place.id}" on this map`;
  }
  if (place.kind === "shop" && shopIds && !shopIds.includes(place.id)) return `Unknown shop "${place.id}" on this map`;
  return null;
}

/** The ids `placeProblem` checks against, read off a `CreepMap`. */
export function placeIds(map) {
  return { startIds: map.starts.map((s) => String(s.player)), mineCount: map.mines.length, shopIds: map.shops.map((s) => s.id) };
}

/** True when the action text already names the place ("Harass their base" at their base),
 *  so the list does not repeat it. Case-insensitive. */
export function actionNamesPlace(action, name) {
  return Boolean(action && name) && action.toLowerCase().includes(name.toLowerCase());
}
