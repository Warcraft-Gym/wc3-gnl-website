import type { Place, PlaceKind } from "@/lib/creep-routes/types";
import { Eye, Hammer, Pickaxe, ShoppingBag, Swords, type LucideIcon } from "lucide-react";
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

/** Lucide's swords as the small mark at an attack disc's top-right (`size` viewBox units, 8 by default): the
 *  legend's loss red over a dark under-stroke. Drawn scaled down, so the strokes are wider in the icon's own units. */
export function SwordsGlyph({ cx, cy, size = 8 }: { cx: number; cy: number; size?: number }) {
  const k = size / 24;
  return (
    <g aria-hidden pointerEvents="none" transform={`translate(${cx - size / 2},${cy - size / 2}) scale(${k})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g stroke="var(--wg-bg)" strokeOpacity={0.8} strokeWidth={2.8 / k}>
        {SWORDS}
      </g>
      <g stroke="var(--wg-loss)" strokeWidth={1.3 / k}>
        {SWORDS}
      </g>
    </g>
  );
}

/** One lucide glyph per place kind, the same in the stop list, the map's waypoint disc and the legend. */
const PLACE_GLYPHS: Record<PlaceKind, LucideIcon> = { attack: Swords, build: Hammer, expand: Pickaxe, shop: ShoppingBag, scout: Eye };

/** The kind's glyph at text size for the stop list, the builder and the legend. */
export function PlaceIcon({ kind, className }: { kind: PlaceKind; className?: string }) {
  const Glyph = PLACE_GLYPHS[kind];
  return <Glyph aria-hidden size={12} strokeWidth={2} className={className} />;
}

/** A waypoint's glyph inside its dark map disc: the list row's lucide glyph in white, `size` viewBox units wide. */
export function WaypointGlyph({ kind, cx, cy, size }: { kind: PlaceKind; cx: number; cy: number; size: number }) {
  const Glyph = PLACE_GLYPHS[kind];
  return <Glyph aria-hidden x={cx - size / 2} y={cy - size / 2} width={size} height={size} stroke="#fff" strokeWidth={2.5} pointerEvents="none" />;
}
