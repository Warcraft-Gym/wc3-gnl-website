import type { Place } from "@/lib/creep-routes/types";

/** The mark a place stop sits on, as a radius in viewBox units: the start X, the
 *  gold-mine and shop icons (`CreepMap`), or the point's own diamond. */
export function placeRadius(place: Place, iw: number, isYou = false) {
  if (place.kind === "start") return (isYou ? 7 : 5) * 1.15;
  if (place.kind === "mine") return 8 * (iw / 256);
  if (place.kind === "shop") return 7 * (iw / 256);
  return 2.5;
}

const under = { stroke: "var(--wg-bg)", strokeOpacity: 0.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** The on-route ring a camp stop's mark gets (1.5px white at 55%), around a place's mark;
 *  a point also draws its 5px diamond here, since nothing else marks that spot. */
export function PlaceRing({ place, cx, cy, r }: { place: Place; cx: number; cy: number; r: number }) {
  return (
    <g data-place={place.kind} pointerEvents="none">
      <circle cx={cx} cy={cy} r={r + 1.5} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" />
      {place.kind === "point" ? (
        <path d={diamond(cx, cy)} fill="none" stroke="#fff" strokeWidth="1.2" paintOrder="stroke" style={{ filter: "drop-shadow(0 0 1px var(--wg-bg))" }} />
      ) : null}
    </g>
  );
}

/** Crossed swords beside a start stop's badge: two 6px white lines over a dark under-stroke. */
export function SwordsGlyph({ cx, cy }: { cx: number; cy: number }) {
  const d = swords(cx, cy);
  return (
    <g aria-hidden pointerEvents="none">
      <path d={d} fill="none" strokeWidth="2.6" {...under} />
      <path d={d} fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

/** The same glyph at text size for the stop list and the builder: swords for a start,
 *  a diamond for a point, nothing for a mine or shop (the map draws their own icons). */
export function PlaceIcon({ place, className }: { place: Place; className?: string }) {
  if (place.kind !== "start" && place.kind !== "point") return null;
  return (
    <svg aria-hidden viewBox="0 0 12 12" width={12} height={12} className={className}>
      <path d={place.kind === "start" ? swords(6, 6, 9) : diamond(6, 6, 9)} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function swords(cx: number, cy: number, len = 6) {
  const h = len / 2 / Math.SQRT2;
  return `M${cx - h},${cy - h}L${cx + h},${cy + h}M${cx - h},${cy + h}L${cx + h},${cy - h}`;
}

function diamond(cx: number, cy: number, size = 5) {
  const h = size / 2;
  return `M${cx},${cy - h}L${cx + h},${cy}L${cx},${cy + h}L${cx - h},${cy}Z`;
}
