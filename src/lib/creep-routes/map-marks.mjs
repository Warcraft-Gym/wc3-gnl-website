/**
 * The route's marks on the map, in viewBox units (`RoutePath`, `CampMarker`). One mark per
 * stop: a stop's node is its badge, a disc with its number inside. A waypoint is a smaller
 * dark disc with its glyph; a camp the route does not use is a small dark dot. Legs run under
 * every node and end at its edge. Plain JS so `node --test` runs `map-marks.test.mjs`.
 */

/** A numbered stop's disc: "12" or "4a" in 10px bold fits inside it. */
export const STOP_RADIUS = 8;
/** A waypoint's dark disc, about 80% of a stop. */
export const WAYPOINT_RADIUS = 6.5;
/** A camp the route does not use, about half a stop. */
export const UNUSED_RADIUS = 4;
/** The white outline around a stop or waypoint disc. */
export const OUTLINE = 1.5;
/** The label's font size; a label of three characters ("12a") is squeezed to fit. */
export const LABEL_SIZE = 10;

/** Where a leg stops short of a node: its disc plus half the outline. */
export function nodeTrim(radius) {
  return radius + OUTLINE / 2;
}

/** The label's squeezed width for a long label ("12a"), else undefined (natural width). */
export function labelFit(label) {
  return String(label).length >= 3 ? 2 * STOP_RADIUS - 3 : undefined;
}

/** The centre of the small mark at a disc's top-right (the attack swords, the hero-off unit). */
export function cornerMark(cx, cy, r = STOP_RADIUS) {
  const d = r * Math.SQRT1_2;
  return { x: cx + d, y: cy - d };
}

/** A leg from (ax, ay) to (bx, by) cut back by `ra` and `rb` so it ends at both node edges;
 *  null when the nodes touch or overlap. */
export function trimLeg(ax, ay, bx, by, ra, rb) {
  const len = Math.hypot(bx - ax, by - ay);
  if (len <= ra + rb) return null;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  return { x1: ax + ux * ra, y1: ay + uy * ra, x2: bx - ux * rb, y2: by - uy * rb, ux, uy, len };
}

/** A node's centre in viewBox units for a spot at image fractions `x`/`y`, pulled inside the
 *  map so a disc of radius `r` (and its outline) never clips at the edge. */
export function nodeCentre(x, y, iw, ih, r = STOP_RADIUS) {
  const m = r + OUTLINE;
  const clamp = (v, max) => Math.min(Math.max(v, m), max - m);
  return { x: clamp(x * iw, iw), y: clamp(y * ih, ih) };
}
