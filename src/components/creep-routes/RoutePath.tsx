import { memo, useMemo } from "react";
import type { CreepMap, RouteStop } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { badgePosition } from "@/lib/creep-routes/badge-position.mjs";
import { radiusFor } from "./CampMarker";

/** Outer edge of a camp mark past its radius: the 1.5px halo ring at r + 1.5. */
const MARK_HALO = 2.25;

/**
 * The route itself: a polyline through the camp stops in order (non-camp
 * stops, `campId: null`, are skipped here and shown only in the stop
 * list) with a numbered badge at each camp stop. Numbers are the stop's
 * real 1-based position in `route.stops`, so they always match the stop
 * list's numbers even when a non-camp stop sits between two camps.
 * `React.memo`d and its own `campById` lookup `useMemo`d — see the F009
 * review, code-b.md items 3/5: this only re-renders on a real prop change
 * now, not on every unrelated hover in the parent `CreepMap`.
 */
export const RoutePath = memo(function RoutePath({
  map,
  stops,
  activeStop,
}: {
  map: CreepMap;
  stops: RouteStop[];
  activeStop?: number | null;
}) {
  const { width: iw, height: ih } = map.image;
  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);

  const points = stops
    .map((s, i) => ({ stop: s, index: i, camp: s.campId ? campById.get(s.campId) : undefined }))
    .filter((p): p is { stop: RouteStop; index: number; camp: NonNullable<typeof p.camp> } => !!p.camp);

  if (!points.length) return null;

  // One segment per leg, trimmed to the edge of each camp mark (its radius
  // plus the halo ring) so the line never runs under a mark or its badge.
  const segments = points.slice(1).flatMap((b, i) => {
    const a = points[i];
    const ax = a.camp.x * iw, ay = a.camp.y * ih, bx = b.camp.x * iw, by = b.camp.y * ih;
    const len = Math.hypot(bx - ax, by - ay);
    const ra = radiusFor(a.camp.level) + MARK_HALO;
    const rb = radiusFor(b.camp.level) + MARK_HALO;
    if (len <= ra + rb) return [];
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    const x1 = ax + ux * ra, y1 = ay + uy * ra, x2 = bx - ux * rb, y2 = by - uy * rb;
    return [{ x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, angle: (Math.atan2(uy, ux) * 180) / Math.PI }];
  });
  const d = segments.map((g) => `M${g.x1.toFixed(1)},${g.y1.toFixed(1)}L${g.x2.toFixed(1)},${g.y2.toFixed(1)}`).join("");
  const under = { stroke: "var(--wg-bg)", strokeOpacity: 0.7, strokeLinejoin: "round", strokeLinecap: "round" } as const;

  return (
    <g>
      {/* A 2px gold line over a 4px ground-colour under-stroke, so it reads
          over any terrain on the minimap. */}
      <path d={d} fill="none" strokeWidth="4" {...under} />
      <path d={d} fill="none" stroke="var(--wg-gold)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* A 6px direction chevron at the middle of every leg. */}
      {segments.map((g, i) => (
        <path
          key={i}
          data-route-direction
          d="M3,0L-3,-3L-3,3Z"
          transform={`translate(${g.mx.toFixed(1)},${g.my.toFixed(1)}) rotate(${g.angle.toFixed(1)})`}
          fill="var(--wg-gold)"
          strokeWidth="2"
          paintOrder="stroke"
          {...under}
        />
      ))}
      {points.map((p) => {
        // Badge floats just above the camp mark, in the same units as the
        // viewBox so it reads the same on a 256x256 map and a 256x192 one —
        // and flips below, rather than clipping, for a camp near the top
        // edge. See `badge-position.mjs`.
        const badge = badgePosition(p.camp.x, p.camp.y, iw, ih);
        const cx = badge.x;
        const badgeY = badge.y;
        const isActive = activeStop === p.index;
        return (
          <g key={p.index} data-stop-marker={p.index + 1}>
            {/* Same rule as `CampMarker`: grow via `transform: scale()` on
             *  a wrapper, not a CSS transition of `r` (compositor-only
             *  motion — DESIGN.md, F009 review code-b.md item 2). 7.5/6 =
             *  1.25, so `scale-125` reproduces the old active radius
             *  exactly. */}
            <g
              style={{ transformBox: "fill-box" }}
              className={cn(
                "origin-center transition-transform duration-[var(--wg-dur-fast)] ease-[var(--wg-ease)] motion-reduce:transition-none",
                isActive ? "scale-125" : "scale-100",
              )}
            >
              <circle
                cx={cx}
                cy={badgeY}
                r={6}
                fill="var(--wg-bg)"
                stroke="var(--wg-gold)"
                strokeWidth={isActive ? 2.2 : 1.4}
                style={{ filter: isActive ? "drop-shadow(0 0 5px var(--wg-gold-glow))" : undefined }}
              />
              <text x={cx} y={badgeY + 3} textAnchor="middle" className="tnum select-none fill-gold text-[8px] font-bold">
                {p.index + 1}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
});
