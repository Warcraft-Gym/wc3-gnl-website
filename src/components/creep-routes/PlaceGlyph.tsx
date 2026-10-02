import type { Place, PlaceKind } from "@/lib/creep-routes/types";
import { Swords } from "lucide-react";
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
 * spot (a diamond; a circle with a dot); at a free point that glyph is the only mark.
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

/** A build diamond or a scout ring with a dot, white 1.2px outline over a dark under-stroke. */
function WaypointShape({ kind, cx, cy, size }: { kind: PlaceKind; cx: number; cy: number; size: number }) {
  const h = size / 2;
  const shape =
    kind === "build" ? (
      <path d={diamond(cx, cy, size)} />
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

/** Lucide's `Swords` (lucide-react icons/swords), its 24-unit drawing. */
const SWORDS = (
  <>
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
    <line x1="13" x2="19" y1="19" y2="13" />
    <line x1="16" x2="20" y1="16" y2="20" />
    <line x1="19" x2="21" y1="21" y2="19" />
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
    <line x1="5" x2="9" y1="14" y2="18" />
    <line x1="7" x2="4" y1="17" y2="20" />
    <line x1="3" x2="5" y1="19" y2="21" />
  </>
);

/** Lucide's swords under an attack stop's badge, 12px: the legend's loss red, 1.5px over a dark 3px under-stroke.
 *  Drawn at half scale, so the strokes are twice as wide in the icon's own units. */
export function SwordsGlyph({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g aria-hidden pointerEvents="none" transform={`translate(${cx - 6},${cy - 6}) scale(0.5)`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g stroke="var(--wg-bg)" strokeOpacity={0.7} strokeWidth={6}>
        {SWORDS}
      </g>
      <g stroke="var(--wg-loss)" strokeWidth={3} style={{ paintOrder: "stroke" }}>
        {SWORDS}
      </g>
    </g>
  );
}

/** The kind's glyph at text size for the stop list, the builder and the legend: lucide's swords
 *  for an attack, a diamond for build, a ring with a dot for scout, a ring for expand and shop. */
export function PlaceIcon({ kind, className }: { kind: PlaceKind; className?: string }) {
  if (kind === "attack") return <Swords aria-hidden size={12} strokeWidth={2} className={className} />;
  return (
    <svg aria-hidden viewBox="0 0 12 12" width={12} height={12} className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        {kind === "build" ? <path d={diamond(6, 6, 8)} /> : null}
        {kind === "scout" || kind === "expand" || kind === "shop" ? <circle cx={6} cy={6} r={3.5} /> : null}
        {kind === "scout" ? <circle cx={6} cy={6} r={0.7} fill="currentColor" /> : null}
      </g>
    </svg>
  );
}

function diamond(cx: number, cy: number, size = 6) {
  const h = size / 2;
  return `M${cx},${cy - h}L${cx + h},${cy}L${cx},${cy + h}L${cx - h},${cy}Z`;
}
