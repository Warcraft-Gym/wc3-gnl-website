/** Where a route stop's numbered badge sits relative to its camp.
 *
 * The badge floats above the camp mark, which clips for a camp near the top
 * of the map: the SVG has no overflow, so the number simply is not drawn.
 * Reported from the editor on Echo Isles, where the top camp sits about 10px
 * from the edge.
 *
 * Flipping below is better than clamping. Clamping slides the badge onto the
 * camp mark and hides the creep icon underneath; flipping keeps the same
 * offset, just mirrored, so the badge stays legible and still obviously
 * belongs to that camp. Only if a map were shorter than two badge diameters
 * — which no real minimap is — would the clamp at the end matter.
 */

/** Badge geometry, in viewBox units (the same units `RoutePath` draws in).
 *  `RADIUS` is the resting circle; the active stop scales 1.25 and strokes
 *  2.2 wide centred on the edge, so the painted extent is a little larger —
 *  `MARGIN` is that worst case, so an active badge never touches the edge. */
export const BADGE_RADIUS = 6;
export const BADGE_OFFSET = 13;
export const BADGE_MARGIN = Math.ceil(BADGE_RADIUS * 1.25 + 2.2 / 2 + 0.5); // 10

/** Badge centre for a camp at normalised `x`/`y` on an `iw` x `ih` image.
 *  Returns `{ x, y, flipped }` — `flipped` is true when the badge had to go
 *  below the camp instead of above. */
export function badgePosition(x, y, iw, ih) {
  const cx = x * iw;
  const cy = y * ih;

  const above = cy - BADGE_OFFSET;
  const below = cy + BADGE_OFFSET;
  const flipped = above < BADGE_MARGIN && below <= ih - BADGE_MARGIN;

  const rawY = flipped ? below : above;
  return {
    x: clamp(cx, BADGE_MARGIN, iw - BADGE_MARGIN),
    y: clamp(rawY, BADGE_MARGIN, ih - BADGE_MARGIN),
    flipped,
  };
}

function clamp(value, min, max) {
  // A map narrower than two margins would invert the bounds; keep the centre
  // rather than returning something outside both.
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}
