/**
 * The route's marks on the map, in viewBox units (`RoutePath`, `CampMarker`). One mark per
 * stop: a stop's node is its badge, a disc with its number inside. A waypoint is a smaller
 * dark disc with its glyph; a camp the route does not use is a small dot in its band colour. Legs run under
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

/** The size of the hero-off unit icon on a disc, in viewBox units. */
export const UNIT_ICON = 10;

/** The centre of the hero-off unit icon: on the disc's lower-left edge, wholly below the number
 *  (a label is at most `2 * STOP_RADIUS - 3` wide and about 7 tall), so the number stays readable. */
export function heroOffMark(cx, cy, r = STOP_RADIUS) {
  return { x: cx - 0.75 * r, y: cy + r + 1 };
}

/** A node's centre in viewBox units for a spot at image fractions `x`/`y`, pulled inside the
 *  map so a disc of radius `r` (and its outline) never clips at the edge. */
export function nodeCentre(x, y, iw, ih, r = STOP_RADIUS) {
  const m = r + OUTLINE;
  const clamp = (v, max) => Math.min(Math.max(v, m), max - m);
  return { x: clamp(x * iw, iw), y: clamp(y * ih, ih) };
}

/** Two legs read as one line when their directions differ by at most this (degrees). */
export const COLLINEAR_DEG = 6;
/** How far a leg shifts sideways from a leg on the same line, in viewBox units. */
export const LEG_GAP = 4;

/** Sideways offsets for legs that would read as one line (straight lines only, no bend: a bend
 *  would suggest a movement path the model does not hold). Two legs that lie on one line (within
 *  `COLLINEAR_DEG`, extents overlapping) shift `LEG_GAP` to opposite sides; a leg that passes through
 *  a stop disc that is not one of its ends shifts that disc's radius + `LEG_GAP` away from it, and a
 *  leg on its line takes the other side. `legs`: `[{ ax, ay, bx, by }]` (end centres); `discs`:
 *  `[{ cx, cy, r }]` (every drawn node). Returns one `{ ox, oy }` per leg. */
export function legOffsets(legs, discs) {
  const geo = legs.map(({ ax, ay, bx, by }) => {
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    return { ax, ay, bx, by, len, ux, uy, nx: -uy, ny: ux };
  });
  const across = (g, x, y) => (x - g.ax) * g.nx + (y - g.ay) * g.ny;
  const along = (g, x, y) => (x - g.ax) * g.ux + (y - g.ay) * g.uy;
  // Pairs on one line: near-parallel, the second leg's ends close to the first's line, extents overlapping.
  const partner = new Map();
  const cosMax = Math.cos((COLLINEAR_DEG * Math.PI) / 180);
  geo.forEach((g, i) =>
    geo.forEach((h, j) => {
      if (j <= i || Math.abs(g.ux * h.ux + g.uy * h.uy) < cosMax) return;
      if (Math.max(Math.abs(across(g, h.ax, h.ay)), Math.abs(across(g, h.bx, h.by))) > 2 * LEG_GAP) return;
      const [lo, hi] = [along(g, h.ax, h.ay), along(g, h.bx, h.by)].sort((p, q) => p - q);
      if (Math.min(hi, g.len) - Math.max(lo, 0) > 1) partner.set(i, j).set(j, i);
    }),
  );
  const offsets = geo.map(() => null);
  // A leg through a disc that is not one of its ends: that disc's radius + the gap, away from the disc.
  geo.forEach((g, i) => {
    const block = discs.find((d) => {
      const t = along(g, d.cx, d.cy);
      const own = Math.hypot(d.cx - g.ax, d.cy - g.ay) < 1 || Math.hypot(d.cx - g.bx, d.cy - g.by) < 1;
      return !own && t > 0 && t < g.len && Math.abs(across(g, d.cx, d.cy)) < d.r + OUTLINE / 2;
    });
    if (!block) return;
    const side = across(g, block.cx, block.cy) > 0 ? -1 : 1;
    const k = side * (block.r + LEG_GAP);
    offsets[i] = { ox: g.nx * k, oy: g.ny * k };
    const j = partner.get(i);
    if (j !== undefined && !offsets[j]) offsets[j] = { ox: -g.nx * side * LEG_GAP, oy: -g.ny * side * LEG_GAP };
  });
  // The other pairs on one line: the gap to opposite sides.
  geo.forEach((g, i) => {
    const j = partner.get(i);
    if (offsets[i] || j === undefined) return;
    offsets[i] = { ox: g.nx * LEG_GAP, oy: g.ny * LEG_GAP };
    if (!offsets[j]) offsets[j] = { ox: -g.nx * LEG_GAP, oy: -g.ny * LEG_GAP };
  });
  return offsets.map((o) => o ?? { ox: 0, oy: 0 });
}

/** A leg moved sideways by (`ox`, `oy`), still ending at its end discs' edges (`ta`, `tb`: where a leg
 *  stops short of each): where the moved line meets each disc, or, when it passes beside a disc, that
 *  disc's edge point on the moved side. Null when the ends touch. */
export function offsetLeg(ax, ay, bx, by, ta, tb, ox = 0, oy = 0) {
  const len = Math.hypot(bx - ax, by - ay);
  if (!len) return null;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  // Only the part of the offset across this leg moves it (a partner's normal is a few degrees off).
  const k = ox * ux + oy * uy;
  ox -= k * ux;
  oy -= k * uy;
  const d = Math.hypot(ox, oy);
  const end = (cx, cy, t, dir) =>
    d < t ? [cx + ox + dir * ux * Math.sqrt(t * t - d * d), cy + oy + dir * uy * Math.sqrt(t * t - d * d)] : [cx + (ox / d) * t, cy + (oy / d) * t];
  const [x1, y1] = end(ax, ay, ta, 1);
  const [x2, y2] = end(bx, by, tb, -1);
  // The ends must still run forward along the leg.
  if ((x2 - x1) * ux + (y2 - y1) * uy <= 0) return null;
  return { x1, y1, x2, y2, ux, uy, len };
}

/** The dark backdrop disc behind a building icon `iconWidth` wide (a gold mine, a shop): a little wider. */
export function backdropRadius(iconWidth) {
  return iconWidth / 2 + 1.5;
}

/** Where a camp's mark sits, in viewBox units: on the camp, or, when the camp's centre lies within a
 *  building icon's backdrop (a camp guarding a gold mine or a shop), centred on that backdrop's
 *  upper-right edge, like a badge on the icon, so the icon stays visible under it. `buildings`:
 *  `[{ x, y, r }]`, each backdrop's centre and radius. */
export function campSpot(x, y, buildings) {
  const b = buildings.find((d) => Math.hypot(x - d.x, y - d.y) < d.r);
  return b ? { x: b.x + b.r * Math.SQRT1_2, y: b.y - b.r * Math.SQRT1_2 } : { x, y };
}
