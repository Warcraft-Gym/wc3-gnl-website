import { memo, useMemo } from "react";
import type { CreepMap, Place, RouteStop } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { gameIconSrc } from "@/lib/builds/icons";
import { LABEL_SIZE, OUTLINE, STOP_RADIUS, WAYPOINT_RADIUS, cornerMark, labelFit, legOffsets, nodeCentre, nodeTrim, offsetLeg } from "@/lib/creep-routes/map-marks.mjs";
import { isWaypoint, placePoint } from "@/lib/creep-routes/place.mjs";
import { hiddenBadgeKeys, numberStops, walkedArm } from "@/lib/creep-routes/stop-numbers.mjs";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { BAND_TOKEN } from "./RouteBadges";
import { placeRadius, SwordsGlyph, WaypointGlyph } from "./PlaceGlyph";

/** Light neutral for the path and its chevrons: edges stay quieter than the stop discs. */
const LINE = "rgba(255,255,255,.85)";
/** The leg into an attack stop: the loss red, so the arrow itself says attack. */
const ATTACK = "var(--wg-loss)";

/** A stop with a spot on the map, centre `cx`/`cy` in viewBox units; `r` is its disc, `trim` where a leg
 *  stops short. `place` only for a place stop; `absent` is a stop the hero does not go to. */
type PathNode = {
  key: string;
  label: string;
  stop: RouteStop;
  cx: number;
  cy: number;
  r: number;
  trim: number;
  /** The disc's fill: the camp's band, the loss red for an attack, the ground for a waypoint. */
  fill: string;
  place?: Place;
  /** A place that is not an attack: a dark disc with its glyph, no number. */
  waypoint?: boolean;
  absent?: boolean;
};

/** `thin`: a lane of an "and" split without the hero. */
type LegStyle = "solid" | "thin";

/**
 * The route itself, in two layers that `CreepMap` paints apart: `legs` under every mark, a
 * polyline through the camp and place stops in order (a base action with no place is skipped
 * here and shown only in the stop list), each leg ending at its nodes' edges; and `nodes` over
 * the camps, one mark per stop. A stop's node is its badge: a disc in the camp's band colour
 * with its number in dark text and a 1.5px white outline; an attack is a disc in the loss red
 * with the red swords at its top-right; a waypoint is a smaller dark disc with its kind's glyph
 * in white and no number. Numbers come from `stop-numbers.mjs`, so they always match the stop
 * list's. A camp stop's disc lets clicks through to its `CampMarker` below. `React.memo`d and
 * its own `campById` lookup `useMemo`d — see the F009 review, code-b.md items 3/5.
 */
export const RoutePath = memo(function RoutePath({
  map,
  stops,
  activeStop,
  youStart = 0,
  onStopSelect,
  choice,
  layer,
}: {
  map: CreepMap;
  stops: RouteStop[];
  /** The selected stop's key (`stop-numbers.mjs`: "0", "2.a.0"). */
  activeStop?: string | null;
  /** Index into `map.starts` of your own base: anchors a split at stop 1. */
  youStart?: number;
  /** Selects an attack stop from its disc (a camp stop selects through its camp marker). */
  onStopSelect?: (key: string) => void;
  /** Split key to the chosen way of each "or"/"xor" split; default way a. */
  choice?: Record<string, number>;
  /** `legs` under the camps, `nodes` (the stop discs) over them: `CreepMap` paints the two apart. */
  layer: "legs" | "nodes";
}) {
  const reduced = useReducedMotion();
  const { width: iw, height: ih } = map.image;
  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);
  // Numbers follow the chosen path of each "or"/"xor" split, like the list's.
  const numbers = useMemo(() => numberStops(stops, choice), [stops, choice]);

  // A stop's spot on the map: a camp, or a place (`place.mjs`), pulled inside the map so its disc never clips.
  const nodeOf = (s: RouteStop, key: string, label: string, style: Partial<PathNode> = {}): PathNode | null => {
    if (s.campId) {
      const camp = campById.get(s.campId);
      if (!camp) return null;
      const c = nodeCentre(camp.x, camp.y, iw, ih);
      return { key, label, stop: s, cx: c.x, cy: c.y, r: STOP_RADIUS, trim: nodeTrim(STOP_RADIUS), fill: BAND_TOKEN[camp.band] ?? "var(--wg-text-faint)", ...style };
    }
    const at = s.place ? placePoint(map, s.place) : null;
    if (!s.place || !at) return null;
    const waypoint = isWaypoint(s);
    const r = waypoint ? WAYPOINT_RADIUS : STOP_RADIUS;
    const c = nodeCentre(at.x, at.y, iw, ih, r);
    return { key, label, stop: s, cx: c.x, cy: c.y, r, trim: nodeTrim(r), fill: waypoint ? "var(--wg-bg)" : ATTACK, place: s.place, waypoint, ...style };
  };

  // Legs run between consecutive nodes. A split's ways all start at the node
  // before it (or your start marker when there is none), and every way's last
  // stop sends a leg into the first shared stop after the split. The walked way
  // (the chosen one, or path a of "and") draws as usual. The map draws only the active
  // path: in "or"/"xor" the paths not chosen have no legs and no discs; in "and" the
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
      (you ? { key: "start", label: "", stop: s, cx: you.x * iw, cy: you.y * ih, r: 0, trim: placeRadius({ kind: "build", at: { start: "" } }, iw, true) + 1, fill: "" } : null);
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
  const hidden = hiddenBadgeKeys(stops, choice);
  if (layer === "nodes") return <Nodes points={points} hidden={hidden} activeStop={activeStop} onStopSelect={onStopSelect} reduced={reduced} />;

  // One straight segment per leg, ending at the edge of each node's disc. Legs that would read as one
  // line (collinear, or through another stop's disc) move sideways apart (`legOffsets`).
  const discs = points.filter((p) => !hidden.has(p.key)).map((p) => ({ cx: p.cx, cy: p.cy, r: p.r }));
  const offsets = legOffsets(legs.map(({ a, b }) => ({ ax: a.cx, ay: a.cy, bx: b.cx, by: b.cy })), discs);
  const segments = legs.flatMap(({ a, b, style }, i) => {
    const leg = offsetLeg(a.cx, a.cy, b.cx, b.cy, a.trim, b.trim, offsets[i].ox, offsets[i].oy);
    if (!leg) return [];
    const { x1, y1, x2, y2 } = leg;
    const seg = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / seg, uy = (y2 - y1) / seg;
    const attack = b.place?.kind === "attack";
    // A thin leg bows 12% of its length to the right of travel, so it never lies on a main leg.
    const bow = 0.24 * seg;
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

  return (
    <g data-route-legs>
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
    </g>
  );
});

/** The stop discs, over the camps: waypoints first, then the stops, the selected one last so its ring is on top. */
function Nodes({
  points,
  hidden,
  activeStop,
  onStopSelect,
  reduced,
}: {
  points: PathNode[];
  hidden: Set<string>;
  activeStop?: string | null;
  onStopSelect?: (key: string) => void;
  reduced: boolean;
}) {
  // A camp a split's drawn paths visit twice keeps one disc, the active path's.
  const shown = points.filter((p) => !hidden.has(p.key));
  const rank = (p: PathNode) => (p.key === activeStop ? 2 : p.waypoint ? 0 : 1);
  return (
    <g data-route-nodes>
      {[...shown].sort((a, b) => rank(a) - rank(b)).map((p) => {
        const isActive = activeStop === p.key;
        const attack = p.place?.kind === "attack";
        // A camp stop's disc lets clicks through to its camp marker; an attack disc selects its stop.
        // ponytail: a disc selects by pointer only; the stop list is the keyboard path to an attack.
        const select = attack && onStopSelect ? () => onStopSelect(p.key) : undefined;
        // Hero off: the first Bring unit's icon at the disc's top-right (top-left on an attack, whose swords are there).
        const unitIcon = p.absent ? p.stop.units?.[0]?.icon : undefined;
        const corner = cornerMark(p.cx, p.cy, p.r);
        const unitAt = attack ? { x: 2 * p.cx - corner.x, y: corner.y } : corner;
        return (
          <g
            key={p.key}
            data-stop-marker={p.waypoint ? undefined : p.label}
            data-waypoint={p.waypoint ? p.place?.kind : undefined}
            onClick={select}
            pointerEvents={select ? undefined : "none"}
            className={select ? "cursor-pointer" : undefined}
          >
            {/* Grow via `transform: scale()` on a wrapper, never a transition of `r`
             *  (compositor-only motion — DESIGN.md, F009 review code-b.md item 2). */}
            <g
              style={{ transformBox: "fill-box" }}
              className={cn(
                "origin-center transition-transform duration-[var(--wg-dur-fast)] ease-[var(--wg-ease)] motion-reduce:transition-none",
                isActive ? "scale-125" : "scale-100",
              )}
            >
              {isActive ? (
                <circle cx={p.cx} cy={p.cy} r={p.r + 4} fill="none" stroke={p.fill} strokeOpacity="0.55" strokeWidth="2">
                  {/* SMIL cannot be paused by CSS: omitted outright under reduced motion; the ring stays, static. */}
                  {!reduced ? <animate attributeName="r" values={`${p.r + 3};${p.r + 7};${p.r + 3}`} dur="1.4s" repeatCount="indefinite" /> : null}
                </circle>
              ) : null}
              <circle
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill={p.fill}
                stroke="#fff"
                strokeWidth={OUTLINE}
                style={{ filter: isActive ? "drop-shadow(0 0 5px var(--wg-gold-glow))" : undefined }}
              />
              {p.waypoint && p.place ? (
                <WaypointGlyph kind={p.place.kind} cx={p.cx} cy={p.cy} size={p.r * 1.2} />
              ) : (
                <text
                  x={p.cx}
                  y={p.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  textLength={labelFit(p.label)}
                  lengthAdjust={labelFit(p.label) ? "spacingAndGlyphs" : undefined}
                  fill="var(--wg-bg)"
                  fontSize={LABEL_SIZE}
                  className="tnum select-none font-bold"
                >
                  {p.label}
                </text>
              )}
              {attack ? <SwordsGlyph cx={corner.x} cy={corner.y} /> : null}
              {unitIcon ? <image data-unit-icon href={gameIconSrc(unitIcon)} x={unitAt.x - 5} y={unitAt.y - 5} width={10} height={10} /> : null}
            </g>
          </g>
        );
      })}
    </g>
  );
}
