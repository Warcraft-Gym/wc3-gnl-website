/**
 * Place stops: `RouteStop.place = { kind, at }` (see `types.ts`). `kind` is the
 * purpose (attack, build, expand, shop, scout, other); `at` is the spot: a start, a gold
 * mine, a shop, looked up on the route's map, or a free point `{ x, y }`. Plain
 * JS so `node --test` runs `place.test.mjs` with no loader.
 */
import { neutralIconFor } from "./neutral-icons.mjs";

/** What happens at a place: `attack` is a numbered stop; the other five are waypoints (on the path, no number). */
export const PLACE_KINDS = ["attack", "build", "expand", "shop", "scout", "other"];

/** True for a place stop that takes no number: every kind but `attack`. */
export function isWaypoint(stop) {
  return Boolean(stop?.place) && stop.place.kind !== "attack";
}

/** True for a pin: a waypoint that marks a place that matters at that moment; the line skips it.
 *  Read pins only through this. ponytail: a pin is stored as `hero: false`, the field's name from
 *  its history; rename it when the schema next changes. */
export function isPin(stop) {
  return isWaypoint(stop) && stop.hero === false;
}

/** True when the hero goes on path `a` of a take-all ("and") block: one of its camp or attack stops
 *  has the hero (`hero !== false`). A waypoint does not count: its `hero: false` is a pin.
 *  ponytail: a path with no camp or attack stop falls back to position (the first path with the
 *  hero, later paths without); the ceiling is a path of waypoints only the hero walks, or not, by
 *  choice: no flag says so until it holds a camp or an attack. */
export function pathHasHero(arms, a) {
  const fights = (arms[a]?.stops ?? []).filter((s) => s.campId || s.place?.kind === "attack");
  return fights.length ? fights.some((s) => s.hero !== false) : a === 0;
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

/** The grey text after a place row's action: the named place (`placeName`) of a start, mine or shop.
 *  A waypoint at a free point and a step with no place have none; an attack there keeps "on the map". */
export function placeWhere(map, place, youStart = 0) {
  if (!place || (place.kind !== "attack" && atKind(place.at) === "point")) return "";
  return placeName(map, place, youStart);
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
 *  a shop a shop visit, your own start a build spot, a free point "other". */
export function kindForClick(at, youPlayer) {
  if (at.start != null) return at.start === youPlayer ? "build" : "attack";
  if (at.mine != null) return "expand";
  if (at.shop != null) return "shop";
  return "other";
}

/** True when the action text already names the place ("Harass their base" at their base),
 *  so the list does not repeat it. Case-insensitive. */
export function actionNamesPlace(action, name) {
  return Boolean(action && name) && action.toLowerCase().includes(name.toLowerCase());
}
