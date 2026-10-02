import { memo, useMemo } from "react";
import type { CreepMap, Place, RouteStop } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { gameIconSrc } from "@/lib/builds/icons";
import { badgePosition } from "@/lib/creep-routes/badge-position.mjs";
import { isWaypoint, placePoint } from "@/lib/creep-routes/place.mjs";
import { hiddenBadgeKeys, numberStops, walkedArm } from "@/lib/creep-routes/stop-numbers.mjs";
import { radiusFor } from "./CampMarker";
import { placeRadius, PlaceRing, SwordsGlyph } from "./PlaceGlyph";

/** Outer edge of a camp mark past its radius: the 1.5px halo ring at r + 1.5. */
const MARK_HALO = 2.25;
/** Light neutral for the path and its chevrons: edges stay quieter than the gold stop badges. */
const LINE = "rgba(255,255,255,.85)";
/** The leg into an attack stop: the loss red, so the arrow itself says attack. */
const ATTACK = "var(--wg-loss)";

/** A stop with a spot on the map; `x`/`y` are image fractions. `place` and its mark radius `r` only for a place stop;
 *  `absent` is a stop the hero does not go to. */
type PathNode = {
  key: string;
  label: string;
  stop: RouteStop;
  x: number;
  y: number;
  trim: number;
  place?: Place;
  r?: number;
  /** A place that is not an attack: on the path, no badge. */
  waypoint?: boolean;
  absent?: boolean;
};

/** `thin`: a lane of an "and" split without the hero. */
type LegStyle = "solid" | "thin";

/**
 * The route itself: a polyline through the camp and place stops in order
 * (a base action with no place is skipped here and shown only in the stop
 * list) with a numbered badge at each camp and attack stop; a waypoint is on
 * the line with its own glyph and no badge. Numbers come from
 * `stop-numbers.mjs`, so they always match the stop list's numbers even
 * when a non-camp stop sits between two camps or a split divides the route.
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
  attackLayer = false,
}: {
  map: CreepMap;
  stops: RouteStop[];
  /** The selected stop's key (`stop-numbers.mjs`: "0", "2.a.0"). */
  activeStop?: string | null;
  /** Index into `map.starts` of your own base; sizes a start place's ring, anchors a split at stop 1. */
  youStart?: number;
  /** Selects a stop from its badge: a place stop or an arm stop (a camp stop also selects through its marker). */
  onStopSelect?: (key: string) => void;
  /** Split key to the chosen way of each "or"/"xor" split; default way a. */
  choice?: Record<string, number>;
  /** Draw only the attack badges: `CreepMap` paints this second copy over the camps. */
  attackLayer?: boolean;
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
    const you = map.starts[youStart];
    const r = placeRadius(s.place, iw, "start" in s.place.at && !!you && String(you.player) === s.place.at.start);
    return { key, label, stop: s, x: at.x, y: at.y, trim: r + MARK_HALO, place: s.place, r, waypoint: isWaypoint(s), ...style };
  };

  // Legs run between consecutive nodes. A split's ways all start at the node
  // before it (or your start marker when there is none), and every way's last
  // stop sends a leg into the first shared stop after the split. The walked way
  // (the chosen one, or path a of "and") draws as usual. The map draws only the active
  // path: in "or"/"xor" the paths not chosen have no legs and no badges; in "and" the
  // other paths are thin and bowed.
  const points: PathNode[] = [];
  const legs: { a: PathNode; b: PathNode; style: LegStyle }[] = [];
  let pending: { node: PathNode; style: LegStyle }[] = [];
  stops.forEach((s, i) => {
    const n = numbers[i];
    const split = s.split;
    if (!split) {
      const node = nodeOf(s, n.key, n.label, { absent: s.hero === false });
      if (!node) return;
      for (const p of pending) legs.push({ a: p.node, b: node, style: p.style });
      points.push(node);
      pending = [{ node, style: "solid" }];
      return;
    }
    const and = split.mode === "and";
    const walked = walkedArm(s, n.key, choice);
    const you = map.starts[youStart];
    const anchor: PathNode | null =
      pending[0]?.node ??
      (you ? { key: "start", label: "", stop: s, x: you.x, y: you.y, trim: placeRadius({ kind: "build", at: { start: "" } }, iw, true) + MARK_HALO } : null);
    const ends: { node: PathNode; style: LegStyle; walked: boolean }[] = [];
    split.arms.forEach((arm, a) => {
      const thin = a !== walked;
      if (thin && !and) return;
      const style: LegStyle = thin ? "thin" : "solid";
      let p = anchor;
      arm.stops.forEach((as, j) => {
        const node = nodeOf(as, n.arms![a].stops[j].key, n.arms![a].stops[j].label, {
          absent: as.hero === false || (and && a > 0),
        });
        if (!node) return;
        if (p) legs.push({ a: p, b: node, style });
        points.push(node);
        p = node;
      });
      if (p) ends.push({ node: p, style, walked: a === walked });
    });
    // The walked way first: a split right after this one starts from it.
    pending = [...ends.filter((e) => e.walked), ...ends.filter((e) => !e.walked)].map(({ node, style }) => ({ node, style }));
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
    const attack = b.place?.kind === "attack";
    // A thin leg bows 12% of its length to the right of travel, so it never lies on a main leg.
    const bow = 0.24 * (len - ra - rb);
    const qx = (x1 + x2) / 2 - uy * bow, qy = (y1 + y2) / 2 + ux * bow;
    return [{ x1, y1, x2, y2, qx, qy, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, angle: (Math.atan2(uy, ux) * 180) / Math.PI, style, attack }];
  });
  const pathOf = (list: typeof segments) =>
    list
      .map((g) =>
        g.style === "thin"
          ? `M${g.x1.toFixed(1)},${g.y1.toFixed(1)}Q${g.qx.toFixed(1)},${g.qy.toFixed(1)} ${g.x2.toFixed(1)},${g.y2.toFixed(1)}`
          : `M${g.x1.toFixed(1)},${g.y1.toFixed(1)}L${g.x2.toFixed(1)},${g.y2.toFixed(1)}`,
      )
      .join("");
  const d = pathOf(segments.filter((g) => g.style === "solid" && !g.attack));
  // A leg of an "and" path the hero does not walk: thin (1.25px), bowed, at 60%, no chevron.
  const dOther = pathOf(segments.filter((g) => g.style === "thin" && !g.attack));
  // A leg into an attack stop, line and chevron, is the loss red over the same under-stroke.
  const dAttack = pathOf(segments.filter((g) => g.style === "solid" && g.attack));
  const dOtherAttack = pathOf(segments.filter((g) => g.style === "thin" && g.attack));
  const under = { stroke: "var(--wg-bg)", strokeOpacity: 0.7, strokeLinejoin: "round", strokeLinecap: "round" } as const;

  // A camp a split visits on two drawn paths keeps one badge, the active path's.
  const hidden = hiddenBadgeKeys(stops, choice);
  const badges = points.map((p) => {
    // A waypoint is on the path but takes no badge: its glyph or ring is its mark. An attack's
    // badge draws in the layer above the camps (`attackLayer`), so a camp by the target never hides it.
    if (p.waypoint || hidden.has(p.key) || (p.place?.kind === "attack") !== attackLayer) return null;
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
    // An attack's badge is ringed in the loss red instead of gold, swords under it.
    const ring = p.place?.kind === "attack" ? "var(--wg-loss)" : "var(--wg-gold)";
    // Hero off: the first Bring unit's icon butts the badge's right edge, so the map says who goes.
    const unitIcon = p.absent ? p.stop.units?.[0]?.icon : undefined;
    // A lettered arm badge ("3a") is a pill wide enough for its label; the 8px type stays.
    const pill = /[a-z]/.test(p.label) ? 6 + p.label.length * 5 : 0;
    return (
      <g key={p.key} data-stop-marker={p.label} onClick={select} className={select ? "cursor-pointer" : undefined}>
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
          {pill ? (
            <rect
              x={cx - pill / 2}
              y={badgeY - 6}
              width={pill}
              height={12}
              rx={6}
              fill="var(--wg-bg)"
              stroke={ring}
              strokeWidth={isActive ? 2.2 : 1.4}
              style={{ filter: isActive ? "drop-shadow(0 0 5px var(--wg-gold-glow))" : undefined }}
            />
          ) : (
            <circle
              cx={cx}
              cy={badgeY}
              r={6}
              fill="var(--wg-bg)"
              stroke={ring}
              strokeWidth={isActive ? 2.2 : 1.4}
              style={{ filter: isActive ? "drop-shadow(0 0 5px var(--wg-gold-glow))" : undefined }}
            />
          )}
          <text x={cx} y={badgeY + 3} textAnchor="middle" className="tnum select-none fill-gold text-[8px] font-bold">
            {p.label}
          </text>
          {p.place?.kind === "attack" ? <SwordsGlyph cx={cx} cy={badgeY + 9.5} /> : null}
          {unitIcon ? (
            <image
              data-unit-icon
              href={gameIconSrc(unitIcon)}
              x={cx + Math.max(6, pill / 2)}
              y={badgeY - 5}
              width={10}
              height={10}
            />
          ) : null}
        </g>
      </g>
    );
  });
  if (attackLayer) return <g data-route-attacks>{badges}</g>;

  return (
    <g>
      {/* A 2px light line over a 4px ground-colour under-stroke, so it reads
          over any terrain on the minimap. */}
      <path d={d} fill="none" strokeWidth="4" {...under} />
      <path d={d} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {dOther ? (
        <g data-route-other opacity={0.6}>
          <path d={dOther} fill="none" strokeWidth="2.75" {...under} />
          <path d={dOther} fill="none" stroke={LINE} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ) : null}
      {dAttack ? (
        <g data-route-attack-leg>
          <path d={dAttack} fill="none" strokeWidth="4" {...under} />
          <path d={dAttack} fill="none" stroke={ATTACK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ) : null}
      {dOtherAttack ? (
        <g data-route-attack-leg opacity={0.6}>
          <path d={dOtherAttack} fill="none" strokeWidth="2.75" {...under} />
          <path d={dOtherAttack} fill="none" stroke={ATTACK} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ) : null}
      {/* A 6px direction chevron at the middle of every leg, same light fill. */}
      {segments.map((g, i) => g.style !== "solid" ? null : (
        <path
          key={i}
          data-route-direction
          d="M3,0L-3,-3L-3,3Z"
          transform={`translate(${g.mx.toFixed(1)},${g.my.toFixed(1)}) rotate(${g.angle.toFixed(1)})`}
          fill={g.attack ? ATTACK : LINE}
          strokeWidth="2"
          paintOrder="stroke"
          {...under}
        />
      ))}
      {points.map((p) =>
        p.place && p.r !== undefined ? <PlaceRing key={`ring-${p.key}`} place={p.place} cx={p.x * iw} cy={p.y * ih} r={p.r} /> : null,
      )}
      {badges}
    </g>
  );
});
