/**
 * Place stops: `RouteStop.place = { kind, at }` (see `types.ts`). `kind` is the
 * purpose (attack, build, expand, shop, scout); `at` is the spot: a start, a gold
 * mine, a shop, looked up on the route's map, or a free point `{ x, y }`. Plain
 * JS so `node --test` runs `place.test.mjs` with no loader.
 */
import { neutralIconFor } from "./neutral-icons.mjs";

/** What happens at a place: `attack` is a numbered stop; the other four are waypoints (on the path, no number). */
export const PLACE_KINDS = ["attack", "build", "expand", "shop", "scout"];

/** True for a place stop that takes no number: every kind but `attack`. */
export function isWaypoint(stop) {
  return Boolean(stop?.place) && stop.place.kind !== "attack";
}

/** The place's position as image fractions (0..1), or null when `at` is not on the map. */
export function placePoint(map, place) {
  const at = place?.at;
  if (!at) return null;
  if (at.start != null) return map.starts.find((s) => String(s.player) === at.start) ?? null;
  if (at.mine != null) return map.mines[Number(at.mine)] ?? null;
  if (at.shop != null) return map.shops.find((s) => s.id === at.shop) ?? null;
  return Number.isFinite(at.x) && Number.isFinite(at.y) ? { x: at.x, y: at.y } : null;
}

/** The muted place name in the stop list: "their base", "your base", "a gold mine", the shop's name, "on the map".
 *  `youStart` is the route's own start index (`CreepRoute.start`). */
export function placeName(map, place, youStart = 0) {
  const at = place.at ?? {};
  if (at.start != null) {
    const i = map.starts.findIndex((s) => String(s.player) === at.start);
    return i === youStart ? "your base" : "their base";
  }
  if (at.mine != null) return "a gold mine";
  if (at.shop != null) return neutralIconFor(at.shop)?.label ?? "shop";
  return "on the map";
}

/** Why `place` cannot stand on a map described by `{ startIds, mineCount, shopIds }`, or null.
 *  Each list is optional; an unknown one skips its check. */
export function placeProblem(place, { startIds, mineCount, shopIds } = {}) {
  const at = place.at ?? {};
  if (at.start != null && startIds && !startIds.includes(at.start)) return `Unknown start "${at.start}" on this map`;
  if (at.mine != null && mineCount !== undefined && !(Number.isInteger(Number(at.mine)) && Number(at.mine) >= 0 && Number(at.mine) < mineCount)) {
    return `Unknown gold mine "${at.mine}" on this map`;
  }
  if (at.shop != null && shopIds && !shopIds.includes(at.shop)) return `Unknown shop "${at.shop}" on this map`;
  return null;
}

/** The ids `placeProblem` checks against, read off a `CreepMap`. */
export function placeIds(map) {
  return { startIds: map.starts.map((s) => String(s.player)), mineCount: map.mines.length, shopIds: map.shops.map((s) => s.id) };
}

/** Which spot `at` names: "start", "mine", "shop" or "point". */
export function atKind(at) {
  if (at?.start != null) return "start";
  if (at?.mine != null) return "mine";
  if (at?.shop != null) return "shop";
  return "point";
}

/** The kind a builder click starts with: an enemy start is an attack, a mine an expansion,
 *  a shop a shop visit, your own start or a free point a build spot. */
export function kindForClick(at, youPlayer) {
  if (at.start != null) return at.start === youPlayer ? "build" : "attack";
  if (at.mine != null) return "expand";
  if (at.shop != null) return "shop";
  return "build";
}

/** True when the action text already names the place ("Harass their base" at their base),
 *  so the list does not repeat it. Case-insensitive. */
export function actionNamesPlace(action, name) {
  return Boolean(action && name) && action.toLowerCase().includes(name.toLowerCase());
}
