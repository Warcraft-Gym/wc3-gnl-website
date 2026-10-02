import { memo, useMemo } from "react";
import type { CreepMap, Place, RouteStop } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { gameIconSrc } from "@/lib/builds/icons";
import { badgePosition } from "@/lib/creep-routes/badge-position.mjs";
import { placePoint } from "@/lib/creep-routes/place.mjs";
import { numberStops } from "@/lib/creep-routes/stop-numbers.mjs";
import { radiusFor } from "./CampMarker";
import { placeRadius, PlaceRing, SwordsGlyph } from "./PlaceGlyph";

/** Outer edge of a camp mark past its radius: the 1.5px halo ring at r + 1.5. */
const MARK_HALO = 2.25;
/** Light neutral for the path and its chevrons: edges stay quieter than the gold stop badges. */
const LINE = "rgba(255,255,255,.85)";

/** A stop with a spot on the map; `x`/`y` are image fractions. `place` and its mark radius `r` only for a place stop;
 *  `absent` is a stop without the hero, `other` a stop on an arm the reader did not choose. */
type PathNode = {
  key: string;
  label: string;
  stop: RouteStop;
  x: number;
  y: number;
  trim: number;
  place?: Place;
  r?: number;
  absent?: boolean;
  other?: boolean;
};

type LegStyle = "solid" | "absent" | "other";

/**
 * The route itself: a polyline through the camp and place stops in order
 * (a base action with no place is skipped here and shown only in the stop
 * list) with a numbered badge at each of them. Numbers come from
 * `stop-numbers.mjs`, so they always match the stop list's numbers even
 * when a non-camp stop sits between two camps or a fork splits the route.
 * `React.memo`d and its own `campById` lookup `useMemo`d — see the F009
 * review, code-b.md items 3/5: this only re-renders on a real prop change
 * now, not on every unrelated hover in the parent `CreepMap`.
 */
export const RoutePath = memo(function RoutePath({
  map,
  stops,
  activeStop,
  youStart = 0,
  onStopSelect,
  choice,
}: {
  map: CreepMap;
  stops: RouteStop[];
  /** The selected stop's key (`stop-numbers.mjs`: "0", "2.a.0"). */
  activeStop?: string | null;
  /** Index into `map.starts` of your own base; sizes a start place's ring, anchors a fork at stop 1. */
  youStart?: number;
  /** Selects a stop from its badge: a place stop or an arm stop (a camp stop also selects through its marker). */
  onStopSelect?: (key: string) => void;
  /** Fork key to the chosen arm of an "either" fork; default arm 0. */
  choice?: Record<string, number>;
}) {
  const { width: iw, height: ih } = map.image;
  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);
  const numbers = useMemo(() => numberStops(stops), [stops]);

  // A stop's spot on the map: a camp, or a place (`place.mjs`). `trim` is
  // the mark's radius plus its halo, where a leg stops short.
  const nodeOf = (s: RouteStop, key: string, label: string, style: Partial<PathNode> = {}): PathNode | null => {
    if (s.campId) {
      const camp = campById.get(s.campId);
      return camp ? { key, label, stop: s, x: camp.x, y: camp.y, trim: radiusFor(camp.level) + MARK_HALO, ...style } : null;
    }
    const at = s.place ? placePoint(map, s.place) : null;
    if (!s.place || !at) return null;
    const r = placeRadius(s.place, iw, s.place.kind === "start" && map.starts[youStart] && String(map.starts[youStart].player) === s.place.id);
    return { key, label, stop: s, x: at.x, y: at.y, trim: r + MARK_HALO, place: s.place, r, ...style };
  };

  // Legs run between consecutive nodes. A fork's arms all start at the node
  // before it (or your start marker when there is none); the route goes on
  // from the end of the arm the hero walks.
  const points: PathNode[] = [];
  const legs: { a: PathNode; b: PathNode; style: LegStyle }[] = [];
  let prev: PathNode | null = null;
  stops.forEach((s, i) => {
    const n = numbers[i];
    if (!s.fork) {
      const node = nodeOf(s, n.key, n.label, { absent: Boolean(s.heroAbsent) });
      if (!node) return;
      if (prev) legs.push({ a: prev, b: node, style: node.absent ? "absent" : "solid" });
      points.push(node);
      prev = node;
      return;
    }
    const both = s.fork.mode === "both";
    const walked = both ? 0 : Math.min(choice?.[n.key] ?? 0, s.fork.arms.length - 1);
    const you = map.starts[youStart];
    const anchor: PathNode | null =
      prev ?? (you ? { key: "start", label: "", stop: s, x: you.x, y: you.y, trim: placeRadius({ kind: "start", id: "" }, iw, true) + MARK_HALO } : null);
    let walkedEnd: PathNode | null = null;
    s.fork.arms.forEach((arm, a) => {
      let p = anchor;
      arm.stops.forEach((as, j) => {
        const other = !both && a !== walked;
        const node = nodeOf(as, n.arms![a].stops[j].key, n.arms![a].stops[j].label, {
          absent: Boolean(as.heroAbsent) || (both && a > 0),
          other,
        });
        if (!node) return;
        if (p) legs.push({ a: p, b: node, style: other ? "other" : node.absent ? "absent" : "solid" });
        points.push(node);
        p = node;
      });
      if (a === walked && p !== anchor) walkedEnd = p;
    });
    prev = walkedEnd ?? prev;
  });

  if (!points.length) return null;

  // One segment per leg, trimmed to the edge of each mark (its radius
  // plus the halo ring) so the line never runs under a mark or its badge.
  const segments = legs.flatMap(({ a, b, style }) => {
    const ax = a.x * iw, ay = a.y * ih, bx = b.x * iw, by = b.y * ih;
    const len = Math.hypot(bx - ax, by - ay);
    const ra = a.trim;
    const rb = b.trim;
    if (len <= ra + rb) return [];
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    const x1 = ax + ux * ra, y1 = ay + uy * ra, x2 = bx - ux * rb, y2 = by - uy * rb;
    return [{ x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, angle: (Math.atan2(uy, ux) * 180) / Math.PI, style }];
  });
  const pathOf = (list: typeof segments) =>
    list.map((g) => `M${g.x1.toFixed(1)},${g.y1.toFixed(1)}L${g.x2.toFixed(1)},${g.y2.toFixed(1)}`).join("");
  const d = pathOf(segments.filter((g) => g.style === "solid"));
  // A leg into a stop without the hero: the same solid line at 55%, no chevron.
  const dAbsent = pathOf(segments.filter((g) => g.style === "absent"));
  // A leg of an arm the reader did not choose: dashed 4 3, 55%, no chevron.
  const dOther = pathOf(segments.filter((g) => g.style === "other"));
  const under = { stroke: "var(--wg-bg)", strokeOpacity: 0.7, strokeLinejoin: "round", strokeLinecap: "round" } as const;

  return (
    <g>
      {/* A 2px light line over a 4px ground-colour under-stroke, so it reads
          over any terrain on the minimap. */}
      <path d={d} fill="none" strokeWidth="4" {...under} />
      <path d={d} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {dAbsent ? (
        <g data-route-absent opacity={0.55}>
          <path d={dAbsent} fill="none" strokeWidth="4" {...under} />
          <path d={dAbsent} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ) : null}
      {dOther ? (
        <g data-route-other opacity={0.55}>
          <path d={dOther} fill="none" strokeWidth="4" strokeDasharray="4 3" {...under} strokeLinecap="butt" />
          <path d={dOther} fill="none" stroke={LINE} strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="butt" />
        </g>
      ) : null}
      {/* A 6px direction chevron at the middle of every leg, same light fill. */}
      {segments.map((g, i) => g.style !== "solid" ? null : (
        <path
          key={i}
          data-route-direction
          d="M3,0L-3,-3L-3,3Z"
          transform={`translate(${g.mx.toFixed(1)},${g.my.toFixed(1)}) rotate(${g.angle.toFixed(1)})`}
          fill={LINE}
          strokeWidth="2"
          paintOrder="stroke"
          {...under}
        />
      ))}
      {points.map((p) =>
        p.place && p.r !== undefined ? <PlaceRing key={`ring-${p.key}`} place={p.place} cx={p.x * iw} cy={p.y * ih} r={p.r} /> : null,
      )}
      {points.map((p) => {
        // Badge floats just above the camp mark, in the same units as the
        // viewBox so it reads the same on a 256x256 map and a 256x192 one —
        // and flips below, rather than clipping, for a camp near the top
        // edge. See `badge-position.mjs`.
        const badge = badgePosition(p.x, p.y, iw, ih);
        const cx = badge.x;
        const badgeY = badge.y;
        const isActive = activeStop === p.key;
        const isArm = p.key.includes(".");
        // ponytail: a badge selects by pointer only; the stop list is the keyboard path to a place or arm stop.
        const select = (p.place || isArm) && onStopSelect ? () => onStopSelect(p.key) : undefined;
        // Without the hero: the first Bring unit's icon butts the badge's right edge; with none, the badge fades.
        const unitIcon = p.absent ? p.stop.units?.[0]?.icon : undefined;
        const fade = p.other ? 0.6 : p.absent && !unitIcon ? 0.55 : undefined;
        // An arm badge ("3a") is a pill wide enough for its label; the 8px type stays.
        const pill = isArm ? 6 + p.label.length * 5 : 0;
        return (
          <g key={p.key} data-stop-marker={p.label} onClick={select} className={select ? "cursor-pointer" : undefined}>
            {/* Same rule as `CampMarker`: grow via `transform: scale()` on
             *  a wrapper, not a CSS transition of `r` (compositor-only
             *  motion — DESIGN.md, F009 review code-b.md item 2). 7.5/6 =
             *  1.25, so `scale-125` reproduces the old active radius
             *  exactly. */}
            <g
              opacity={fade}
              style={{ transformBox: "fill-box" }}
              className={cn(
                "origin-center transition-transform duration-[var(--wg-dur-fast)] ease-[var(--wg-ease)] motion-reduce:transition-none",
                isActive ? "scale-125" : "scale-100",
              )}
            >
              {pill ? (
                <rect
                  x={cx - pill / 2}
                  y={badgeY - 6}
                  width={pill}
                  height={12}
                  rx={6}
                  fill="var(--wg-bg)"
                  stroke="var(--wg-gold)"
                  strokeWidth={isActive ? 2.2 : 1.4}
                  style={{ filter: isActive ? "drop-shadow(0 0 5px var(--wg-gold-glow))" : undefined }}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={badgeY}
                  r={6}
                  fill="var(--wg-bg)"
                  stroke="var(--wg-gold)"
                  strokeWidth={isActive ? 2.2 : 1.4}
                  style={{ filter: isActive ? "drop-shadow(0 0 5px var(--wg-gold-glow))" : undefined }}
                />
              )}
              <text x={cx} y={badgeY + 3} textAnchor="middle" className="tnum select-none fill-gold text-[8px] font-bold">
                {p.label}
              </text>
              {p.place?.kind === "start" ? <SwordsGlyph cx={cx + Math.max(6, pill / 2) + 4.5} cy={badgeY} /> : null}
              {unitIcon ? <image data-unit-icon href={gameIconSrc(unitIcon)} x={cx + Math.max(6, pill / 2)} y={badgeY - 5} width={10} height={10} /> : null}
            </g>
          </g>
        );
      })}
    </g>
  );
});
