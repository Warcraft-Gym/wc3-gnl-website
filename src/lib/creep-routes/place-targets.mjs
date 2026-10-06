// The builder's place targets in places mode, laid out in CSS px of the drawn map.

/** A target's radius: 32 CSS px across. */
export const TARGET_R = 16;
/** The least gap between two targets. */
export const TARGET_GAP = 6;
/** A click this far outside a target's disc still counts as that target. */
export const MAGNET = 6;

/**
 * Each target at its place's spot (`points`, px), pushed apart along the line between them where two
 * would overlap, then kept inside the map. `moved` when it no longer sits on its spot.
 * @param {{ x: number; y: number }[]} points
 * @param {number} w
 * @param {number} h
 * @returns {{ x: number; y: number; moved: boolean }[]}
 */
export function layoutTargets(points, w, h, r = TARGET_R, gap = TARGET_GAP) {
  const t = points.map((p) => ({ x: p.x, y: p.y }));
  const need = 2 * r + gap;
  // ponytail: pairwise passes until no pair overlaps, at most 8; a map packed tighter than that keeps an overlap.
  for (let pass = 0; pass < 8; pass++) {
    let clean = true;
    for (let a = 0; a < t.length; a++)
      for (let b = a + 1; b < t.length; b++) {
        const dx = t[b].x - t[a].x, dy = t[b].y - t[a].y;
        const d = Math.hypot(dx, dy);
        if (d >= need - 0.01) continue;
        clean = false;
        // Two on one spot part sideways.
        const ux = d ? dx / d : 1, uy = d ? dy / d : 0;
        const push = (need - d) / 2;
        t[a].x -= ux * push;
        t[a].y -= uy * push;
        t[b].x += ux * push;
        t[b].y += uy * push;
      }
    for (const o of t) {
      o.x = Math.min(w - r - 2, Math.max(r + 2, o.x));
      o.y = Math.min(h - r - 2, Math.max(r + 2, o.y));
    }
    if (clean) break;
  }
  return t.map((o, i) => ({ ...o, moved: Math.hypot(o.x - points[i].x, o.y - points[i].y) > 2 }));
}

/**
 * The index of the target a click at (x, y) px takes: the nearest whose disc, widened by `magnet`,
 * holds the point; -1 for none (the click is a free point).
 * @param {number} x
 * @param {number} y
 * @param {{ x: number; y: number }[]} targets
 */
export function nearTarget(x, y, targets, r = TARGET_R, magnet = MAGNET) {
  let best = -1, bestD = r + magnet;
  targets.forEach((t, i) => {
    const d = Math.hypot(t.x - x, t.y - y);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}
