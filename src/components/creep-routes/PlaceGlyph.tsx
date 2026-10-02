import type { Place, PlaceKind } from "@/lib/creep-routes/types";
import { atKind } from "@/lib/creep-routes/place.mjs";

/** The mark a place sits on, as a radius in viewBox units: the start X, the gold-mine and
 *  shop icons (`CreepMap`), or a free point's own waypoint glyph. */
export function placeRadius(place: Place, iw: number, isYou = false) {
  const spot = atKind(place.at);
  if (spot === "start") return (isYou ? 7 : 5) * 1.15;
  if (spot === "mine") return 8 * (iw / 256);
  if (spot === "shop") return 7 * (iw / 256);
  return 3;
}

const under = { stroke: "var(--wg-bg)", strokeOpacity: 0.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * A place's mark on the path. A start, mine or shop gets the on-route ring a camp stop's mark
 * gets (1.5px white at 55%): that ring is the whole mark of an expand or shop waypoint and of
 * an attack's target. A build or scout waypoint also draws its 6px white outline glyph on the
 * spot (a square; a circle with a dot); at a free point that glyph is the only mark.
 */
export function PlaceRing({ place, cx, cy, r }: { place: Place; cx: number; cy: number; r: number }) {
  const onIcon = atKind(place.at) !== "point";
  const glyph = place.kind === "build" || place.kind === "scout";
  return (
    <g data-place={place.kind} pointerEvents="none">
      {onIcon ? <circle cx={cx} cy={cy} r={r + 1.5} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" /> : null}
      {glyph ? <WaypointShape kind={place.kind} cx={cx} cy={cy} size={6} /> : null}
    </g>
  );
}

/** A build square or a scout ring with a dot, white 1.2px outline over a dark under-stroke. */
function WaypointShape({ kind, cx, cy, size }: { kind: PlaceKind; cx: number; cy: number; size: number }) {
  const h = size / 2;
  const shape =
    kind === "build" ? (
      <rect x={cx - h} y={cy - h} width={size} height={size} />
    ) : (
      <>
        <circle cx={cx} cy={cy} r={h} />
        <circle cx={cx} cy={cy} r={0.6} fill="#fff" />
      </>
    );
  return (
    <>
      <g fill="none" strokeWidth="2.6" {...under}>
        {shape}
      </g>
      <g fill="none" stroke="#fff" strokeWidth="1.2">
        {shape}
      </g>
    </>
  );
}

/** Crossed swords under an attack stop's badge: two 6px white lines over a dark under-stroke. */
export function SwordsGlyph({ cx, cy }: { cx: number; cy: number }) {
  const d = swords(cx, cy);
  return (
    <g aria-hidden pointerEvents="none">
      <path d={d} fill="none" strokeWidth="2.6" {...under} />
      <path d={d} fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

/** The kind's glyph at text size for the stop list, the builder and the legend: swords for an
 *  attack, a square for build, a ring with a dot for scout, a ring for expand and shop. */
export function PlaceIcon({ kind, className }: { kind: PlaceKind; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" width={12} height={12} className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        {kind === "attack" ? <path d={swords(6, 6, 9)} /> : null}
        {kind === "build" ? <rect x={2.5} y={2.5} width={7} height={7} /> : null}
        {kind === "scout" || kind === "expand" || kind === "shop" ? <circle cx={6} cy={6} r={3.5} /> : null}
        {kind === "scout" ? <circle cx={6} cy={6} r={0.7} fill="currentColor" /> : null}
      </g>
    </svg>
  );
}

function swords(cx: number, cy: number, len = 6) {
  const h = len / 2 / Math.SQRT2;
  return `M${cx - h},${cy - h}L${cx + h},${cy + h}M${cx - h},${cy + h}L${cx + h},${cy - h}`;
}
