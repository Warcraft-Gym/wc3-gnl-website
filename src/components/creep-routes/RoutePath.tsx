import type { CreepMap, RouteStop } from "@/lib/creep-routes/types";

/**
 * The route itself: a polyline through the camp stops in order (non-camp
 * stops, `campId: null`, are skipped here and shown only in the step
 * table) with a numbered badge at each camp stop. Numbers are the stop's
 * real 1-based position in `route.stops`, so they always match the step
 * table's row numbers even when a non-camp stop sits between two camps.
 */
export function RoutePath({
  map,
  stops,
  activeStop,
}: {
  map: CreepMap;
  stops: RouteStop[];
  activeStop?: number | null;
}) {
  const { width: iw, height: ih } = map.image;
  const campById = new Map(map.camps.map((c) => [c.id, c]));

  const points = stops
    .map((s, i) => ({ stop: s, index: i, camp: s.campId ? campById.get(s.campId) : undefined }))
    .filter((p): p is { stop: RouteStop; index: number; camp: NonNullable<typeof p.camp> } => !!p.camp);

  if (!points.length) return null;

  const d = points
    .map((p, i) => `${i ? "L" : "M"}${(p.camp.x * iw).toFixed(1)},${(p.camp.y * ih).toFixed(1)}`)
    .join(" ");

  return (
    <g>
      {/* Under-stroke in the ground colour, so the gold path reads over any
          terrain on the minimap. */}
      <path d={d} fill="none" stroke="var(--wg-bg)" strokeOpacity="0.75" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--wg-gold)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) => {
        const cx = p.camp.x * iw;
        // Badge floats just above the camp mark, offset in the same pixel
        // units as the viewBox (image width), so it reads the same on a
        // 256x256 map and a 256x192 one.
        const badgeY = p.camp.y * ih - 13;
        const isActive = activeStop === p.index;
        return (
          <g key={p.index} data-stop-marker={p.index + 1}>
            <circle
              cx={cx}
              cy={badgeY}
              r={isActive ? 7.5 : 6}
              fill="var(--wg-bg)"
              stroke="var(--wg-gold)"
              strokeWidth={isActive ? 2.2 : 1.4}
              style={{
                filter: isActive ? "drop-shadow(0 0 5px var(--wg-gold-glow))" : undefined,
                transition: "r var(--wg-dur-fast) var(--wg-ease)",
              }}
              className="motion-reduce:transition-none"
            />
            <text x={cx} y={badgeY + 3} textAnchor="middle" className="tnum select-none fill-gold text-[8px] font-bold">
              {p.index + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}
