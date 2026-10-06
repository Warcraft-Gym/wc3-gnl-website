import { memo, useMemo } from "react";
import type { CreepMap, Place, RouteStop } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { gameIconSrc } from "@/lib/builds/icons";
import { LABEL_SIZE, OUTLINE, STOP_RADIUS, WAYPOINT_RADIUS, UNIT_ICON, cornerMark, heroOffMark, labelFit, legOffsets, nodeCentre, nodeTrim, offsetLeg } from "@/lib/creep-routes/map-marks.mjs";
import { isWaypoint, placePoint } from "@/lib/creep-routes/place.mjs";
import { hiddenBadgeKeys } from "@/lib/creep-routes/stop-numbers.mjs";
import { routeLegs } from "@/lib/creep-routes/route-legs.mjs";
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
  /** A pin (`isPin`): the waypoint disc with a dashed outline and no legs. */
  pin?: boolean;
};

/** A press on a waypoint or pin mark: its stop key, the event, and how the mark looks. */
export type MarkDown = (key: string, e: React.PointerEvent, mark: { kind: Place["kind"]; pin: boolean }) => void;

/** `thin`: a lane of an "and" split without the hero. */
type LegStyle = "solid" | "thin";

/**
 * The route itself, in two layers that `CreepMap` paints apart: `legs` under every mark, a
 * polyline through the camp and place stops in order (a base action with no place is skipped
 * here and shown only in the stop list), each leg ending at its nodes' edges; and `nodes` over
 * the camps, one mark per stop. A stop's node is its badge: a disc in the camp's band colour
 * with its number in dark text and a 1.5px white outline; an attack is a disc in the loss red
 * with the red swords at its top-right; a waypoint is a smaller dark disc with its kind's glyph
 * in white and no number, a pin the same disc with a dashed outline and no legs. Numbers come from `stop-numbers.mjs`, so they always match the stop
 * list's. A camp stop's disc lets clicks through to its `CampMarker` below. `React.memo`d and
 * its own `campById` lookup `useMemo`d — see the F009 review, code-b.md items 3/5.
 */
export const RoutePath = memo(function RoutePath({
  map,
  stops,
  activeStop,
  ringStop,
  youStart = 0,
  onStopSelect,
  choice,
  campAt,
  layer,
  activeLeg,
  onLeg,
  replacing = false,
  drag,
  onMarkDown,
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
  /** Where each camp's mark sits (viewBox units), when it guards a building (`campSpot`). */
  campAt?: Map<string, { x: number; y: number }>;
  /** `legs` under the camps, `nodes` (the stop discs) over them: `CreepMap` paints the two apart. */
  layer: "legs" | "nodes";
  /** The stop whose row is pointed at or focused in the list: its mark gets a ring. */
  ringStop?: string | null;
  /** The leg the builder's target sits on (its two stop keys): dashed gold. */
  activeLeg?: { a: string; b: string } | null;
  /** The builder: a click on a leg inside one list puts the next step there. */
  onLeg?: (a: string, b: string) => void;
  /** The map previews a step on the active leg: that leg draws at 30%. */
  replacing?: boolean;
  /** A waypoint or pin mark being dragged: its stop key and where it is now (viewBox units); its legs follow. */
  drag?: { key: string; x: number; y: number } | null;
  /** The builder with a fine pointer: a press on a waypoint or pin mark may start a drag. */
  onMarkDown?: MarkDown;
}) {
  const reduced = useReducedMotion();
  const { width: iw, height: ih } = map.image;
  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);
  // Numbers follow the chosen path of each "or"/"xor" split, like the list's.

  // A stop's spot on the map: a camp, or a place (`place.mjs`), pulled inside the map so its disc never clips.
  const nodeOf = (s: RouteStop, key: string, label: string, style: Partial<PathNode> = {}): PathNode | null => {
    if (s.campId) {
      const camp = campById.get(s.campId);
      if (!camp) return null;
      const spot = campAt?.get(camp.id);
      const c = spot ? nodeCentre(spot.x / iw, spot.y / ih, iw, ih) : nodeCentre(camp.x, camp.y, iw, ih);
      return { key, label, stop: s, cx: c.x, cy: c.y, r: STOP_RADIUS, trim: nodeTrim(STOP_RADIUS), fill: BAND_TOKEN[camp.band] ?? "var(--wg-text-faint)", ...style };
    }
    const at = s.place ? placePoint(map, s.place) : null;
    if (!s.place || !at) return null;
    const waypoint = isWaypoint(s);
    const r = waypoint ? WAYPOINT_RADIUS : STOP_RADIUS;
    const c = nodeCentre(at.x, at.y, iw, ih, r);
    return { key, label, stop: s, cx: c.x, cy: c.y, r, trim: nodeTrim(r), fill: waypoint ? "var(--wg-bg)" : ATTACK, place: s.place, waypoint, ...style };
  };

  // Which stops are drawn and which legs join them (`route-legs.mjs`): the chosen path of an
  // "or"/"xor" split, every path of an "and" split (a path without the hero thin and bowed). A pin is a node
  // with no legs.
  const you = map.starts[youStart];
  const plan = routeLegs(stops, choice, (s) => Boolean(nodeOf(s, "", "")));
  const points = plan.nodes.flatMap((n) => nodeOf(n.stop, n.key, n.label, { absent: n.absent, pin: n.pin }) ?? []).map((p) => (drag?.key === p.key ? { ...p, cx: drag.x, cy: drag.y } : p));
  const byKey = new Map<string, PathNode>(points.map((p) => [p.key, p]));
  if (you) byKey.set("start", { key: "start", label: "", stop: stops[0], cx: you.x * iw, cy: you.y * ih, r: 0, trim: placeRadius({ kind: "build", at: { start: "" } }, iw, true) + 1, fill: "" });
  const legs = plan.legs.flatMap(({ a, b, style }) => {
    const from = byKey.get(a);
    const to = byKey.get(b);
    return from && to ? [{ a: from, b: to, style: style as LegStyle }] : [];
  });

  if (!points.length) return null;
  const hidden = hiddenBadgeKeys(stops, choice);
  if (layer === "nodes") return <Nodes points={points} hidden={hidden} activeStop={activeStop} ringStop={ringStop} onStopSelect={onStopSelect} onMarkDown={onMarkDown} reduced={reduced} />;

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
    const active = activeLeg?.a === a.key && activeLeg?.b === b.key;
    return [{ a, b, x1, y1, x2, y2, qx, qy, mx: (x1 + x2) / 2, my: (y1 + y2) / 2, angle: (Math.atan2(uy, ux) * 180) / Math.PI, style, attack, active }];
  });
  const pathOf = (list: typeof segments) =>
    list
      .map((g) =>
        g.style === "thin"
          ? `M${g.x1.toFixed(1)},${g.y1.toFixed(1)}Q${g.qx.toFixed(1)},${g.qy.toFixed(1)} ${g.x2.toFixed(1)},${g.y2.toFixed(1)}`
          : `M${g.x1.toFixed(1)},${g.y1.toFixed(1)}L${g.x2.toFixed(1)},${g.y2.toFixed(1)}`,
      )
      .join("");
  // The target's leg draws dashed gold on its own, over the same under-stroke.
  const dActive = pathOf(segments.filter((g) => g.active));
  const d = pathOf(segments.filter((g) => g.style === "solid" && !g.attack && !g.active));
  // A leg of an "and" path the hero does not walk: thin (1.25px), bowed, at 60%, no chevron.
  const dOther = pathOf(segments.filter((g) => g.style === "thin" && !g.attack && !g.active));
  // A leg into an attack stop, line and chevron, is the loss red over the same under-stroke.
  const dAttack = pathOf(segments.filter((g) => g.style === "solid" && g.attack && !g.active));
  const dOtherAttack = pathOf(segments.filter((g) => g.style === "thin" && g.attack && !g.active));
  // A leg inside one list (the route, or one path) takes a click; legs from your start or into or out of a path do not.
  const listOf = (k: string) => (k.includes(".") ? k.split(".").slice(0, 2).join(".") : "");
  // A leg of one list; a route leg that crosses a paths block (its shown path has no place step) takes no click.
  const crossesBlock = (a: string, b: string) => !a.includes(".") && stops.slice(Number(a) + 1, Number(b)).some((s) => s.split);
  const clickable = onLeg ? segments.filter((g) => g.a.key !== "start" && listOf(g.a.key) === listOf(g.b.key) && !crossesBlock(g.a.key, g.b.key)) : [];
  const nameOf = (p: PathNode) => (p.label ? `stop ${p.label}` : p.stop.action?.trim() || "the waypoint");
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
      {dActive ? (
        <g data-route-active-leg opacity={replacing ? 0.3 : undefined}>
          <path d={dActive} fill="none" strokeWidth="4" {...under} />
          <path d={dActive} fill="none" stroke="var(--wg-gold)" strokeWidth="2" strokeDasharray="4 3" />
        </g>
      ) : null}
      {/* A 6px direction chevron at the middle of every leg, in its leg's colour (gold on the target's leg). */}
      {segments.map((g, i) => g.style !== "solid" ? null : (
        <path
          key={i}
          data-route-direction
          d="M3,0L-3,-3L-3,3Z"
          transform={`translate(${g.mx.toFixed(1)},${g.my.toFixed(1)}) rotate(${g.angle.toFixed(1)})`}
          fill={g.active ? "var(--wg-gold)" : g.attack ? ATTACK : LINE}
          opacity={g.active && replacing ? 0.3 : undefined}
          strokeWidth="2"
          paintOrder="stroke"
          {...under}
        />
      ))}
      {/* Each leg's hit line: 12 CSS px, transparent, gold on hover or focus. */}
      {clickable.map((g) => {
        const leg = pathOf([g]);
        const pick = () => onLeg?.(g.a.key, g.b.key);
        return (
          <g
            key={`${g.a.key}>${g.b.key}`}
            data-leg={`${g.a.key}>${g.b.key}`}
            role="button"
            tabIndex={0}
            aria-pressed={g.active}
            aria-label={`Put the next step between ${nameOf(g.a)} and ${nameOf(g.b)}`}
            onClick={pick}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              e.stopPropagation();
              pick();
            }}
            className="group cursor-pointer outline-none"
          >
            <path d={leg} fill="none" stroke="var(--wg-gold)" strokeWidth="2" strokeLinecap="round" className={cn("opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100", g.active && "hidden")} pointerEvents="none" />
            <path d={leg} fill="none" stroke="transparent" strokeWidth={12} vectorEffect="non-scaling-stroke" pointerEvents="stroke" />
          </g>
        );
      })}
    </g>
  );
});

/** The stop discs, over the camps: waypoints first, then the stops, the selected one last so its ring is on top. */
function Nodes({
  points,
  hidden,
  activeStop,
  ringStop,
  onStopSelect,
  onMarkDown,
  reduced,
}: {
  onMarkDown?: MarkDown;
  points: PathNode[];
  ringStop?: string | null;
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
        // A camp stop's disc lets clicks through to its camp marker; a place's disc (an attack, a waypoint, a pin) opens its row.
        // ponytail: a disc selects by pointer only; the stop list is the keyboard path to it.
        const select = p.place && onStopSelect ? () => onStopSelect(p.key) : undefined;
        // Hero off: the first Bring unit's icon on the disc's lower-left edge, clear of the number (not on a pin).
        const unitIcon = p.absent && !p.pin ? p.stop.units?.[0]?.icon : undefined;
        // The swords sit 3 units out from the disc edge, clear of a two-character label ("3b").
        const corner = cornerMark(p.cx, p.cy, p.r + 3);
        const unitAt = heroOffMark(p.cx, p.cy, p.r);
        // A waypoint or pin mark drags with a fine pointer; camp stops and attacks never do.
        const grab = p.waypoint && p.place && onMarkDown ? (e: React.PointerEvent) => onMarkDown(p.key, e, { kind: p.place!.kind, pin: Boolean(p.pin) }) : undefined;
        return (
          <g
            key={p.key}
            data-stop-marker={p.waypoint ? undefined : p.label}
            data-waypoint={p.waypoint ? p.place?.kind : undefined}
            data-pin={p.pin || undefined}
            onClick={select}
            onPointerDown={grab}
            pointerEvents={select ? undefined : "none"}
            className={grab ? "cursor-grab" : select ? "cursor-pointer" : undefined}
          >
            {/* A row pointed at or focused in the list rings its mark. */}
            {ringStop === p.key ? <circle data-ring cx={p.cx} cy={p.cy} r={p.r + 3.5} fill="none" stroke="var(--wg-gold)" strokeWidth={1.5} /> : null}
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
                strokeDasharray={p.pin ? "2 1.5" : undefined}
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
              {unitIcon ? <image data-unit-icon href={gameIconSrc(unitIcon)} x={unitAt.x - UNIT_ICON / 2} y={unitAt.y - UNIT_ICON / 2} width={UNIT_ICON} height={UNIT_ICON} /> : null}
            </g>
          </g>
        );
      })}
    </g>
  );
}
