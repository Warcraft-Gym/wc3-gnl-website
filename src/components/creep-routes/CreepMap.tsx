"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CreepMap as CreepMapType, MapMine, MapShop, MapStart, RouteStop } from "@/lib/creep-routes/types";
import { CampMarker, radiusFor } from "./CampMarker";
import { RoutePath } from "./RoutePath";
import { CampDetails } from "./CampDetails";
import { neutralIconFor } from "@/lib/creep-routes/neutral-icons";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import { cn } from "@/lib/utils";

export type CreepMapProps = {
  map: CreepMapType;
  route?: { stops: RouteStop[]; start?: number };
  /** 0-based index into `route.stops`; enlarges/glows that stop's marker
   *  when it's a camp stop. Lifted by the page so the map and the step
   *  table's hover/focus/click stay in sync. */
  activeStop?: number | null;
  /** Renders camps as real `<button>`s (via `foreignObject`) — the
   *  editor's add/remove-a-stop click, and the read-only route page's
   *  select-a-stop click (F009). */
  onCampSelect?: (campId: string) => void;
  /** Restricts which camps become clickable buttons when `onCampSelect` is
   *  given — the read-only route page only wants its own route's camps
   *  clickable (clicking any other camp would be a dead, inert-looking
   *  button); the editor wants every camp clickable (any camp can become a
   *  stop) and leaves this unset. Unset/omitted means "every camp". */
  interactiveCampIds?: Set<string>;
  highlightCamps?: Set<string>;
  className?: string;
};

/**
 * A start spot, drawn from *your* perspective: your own base is a red X
 * (`--wg-loss`, ~16px across at this 256-viewBox scale, 2px stroke), every
 * other start is a small muted blue X (`--wg-win` at 60% opacity, ~11.5px)
 * — wc3.no's convention, kept as a reference for harass/defend stops. No
 * "P0"/"P1" text: a route is always drawn from your own base, so there is
 * nothing left to disambiguate. Both marks get the same dark under-stroke
 * `RoutePath`'s line uses, so they read over any terrain colour. ~15%
 * larger than the original 14px/10px (F009 review, ux.md item 9): still no
 * text label, only size — a legend entry already names them.
 */
function StartMarker({ start, iw, ih, isYou }: { start: MapStart; iw: number; ih: number; isYou: boolean }) {
  const cx = start.x * iw;
  const cy = start.y * ih;
  const s = (isYou ? 7 : 5) * 1.15;
  const d = `M${(cx - s).toFixed(1)},${(cy - s).toFixed(1)} L${(cx + s).toFixed(1)},${(cy + s).toFixed(1)} M${(cx - s).toFixed(1)},${(cy + s).toFixed(1)} L${(cx + s).toFixed(1)},${(cy - s).toFixed(1)}`;
  return (
    <g data-start={isYou ? "you" : "opponent"} opacity={isYou ? 1 : 0.6}>
      <path d={d} fill="none" stroke="var(--wg-bg)" strokeOpacity="0.75" strokeWidth={isYou ? 4 : 3} strokeLinecap="round" />
      <path d={d} fill="none" stroke={isYou ? "var(--wg-loss)" : "var(--wg-win)"} strokeWidth={isYou ? 2 : 1.5} strokeLinecap="round" />
    </g>
  );
}

/** Gold mine, drawn with Liquipedia's own icon (`/map-icons/gold-mine.png`,
 *  64x53) — ~16px wide at this 256-viewBox scale, scales with the map.
 *  `<image>`'s default `preserveAspectRatio` ("xMidYMid meet") fits the
 *  icon inside the box without distorting it, so a fixed square box works
 *  for every icon regardless of its own aspect ratio. */
const MINE_ICON_WIDTH = 16;

function MineMarker({ mine, iw, ih }: { mine: MapMine; iw: number; ih: number }) {
  const cx = mine.x * iw;
  const cy = mine.y * ih;
  const w = MINE_ICON_WIDTH * (iw / 256);
  const h = w * (53 / 64);
  return (
    <image
      data-mine=""
      href="/map-icons/gold-mine.png"
      x={cx - w / 2}
      y={cy - h / 2}
      width={w}
      height={h}
      aria-label="Gold mine"
      style={{ pointerEvents: "none" }}
    >
      <title>Gold mine</title>
    </image>
  );
}

/** A neutral building (tavern, goblin merchant, mercenary camp…), drawn
 *  with Liquipedia's icon for that unit — see `neutral-icons.ts` for the
 *  rawcode -> icon map. A shop whose rawcode has no icon (a decorative
 *  critter/hut, not a real shop — `hrdh`, `ntn2`, `nrat`… on Autumn Leaves)
 *  renders nothing, per that module's doc comment. */
const SHOP_ICON_WIDTH = 14;

function NeutralMarker({ shop, iw, ih }: { shop: MapShop; iw: number; ih: number }) {
  const icon = neutralIconFor(shop.id);
  if (!icon) return null;
  const cx = shop.x * iw;
  const cy = shop.y * ih;
  const w = SHOP_ICON_WIDTH * (iw / 256);
  const h = w;
  return (
    <image
      data-shop={shop.id}
      href={`/map-icons/${icon.icon}.png`}
      x={cx - w / 2}
      y={cy - h / 2}
      width={w}
      height={h}
      aria-label={icon.label}
      style={{ pointerEvents: "none" }}
    >
      <title>{icon.label}</title>
    </image>
  );
}

/**
 * The creep map: the minimap image with camps (coloured by difficulty
 * band), every start spot (your own base a red X, every other a small
 * muted blue X — see `StartMarker`), the gold mines and — when a route is
 * given — the numbered route path. One SVG keyboard stop like `MmrChart`: arrow
 * keys walk the route's camp stops (or every camp, with no route), Escape
 * clears, and an `aria-live` region names the current camp for anyone who
 * isn't hovering it. The real `<table>` fallback for assistive tech is
 * `RouteStepTable`, rendered by the page below this component.
 *
 * Hover uses one delegated `pointerover`/`pointerout` pair on the `<svg>`
 * (`event.target.closest('[data-camp]')`) instead of a handler per marker:
 * a per-marker inline closure would recreate on every render and defeat
 * `CampMarker`'s own `React.memo` the moment any one camp is hovered — see
 * the F009 review, code-b.md item 3.
 */
export function CreepMap({ map, route, activeStop = null, onCampSelect, interactiveCampIds, highlightCamps, className }: CreepMapProps) {
  const [width, setWidth] = useState(0);
  const [hoverCamp, setHoverCamp] = useState<string | null>(null);
  const [walkIndex, setWalkIndex] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // The SVG's own box, unpadded — `CampDetails` is anchored inside this
  // wrapper, not the padded card, so its pixel coordinates (x*width,
  // y*height below) line up exactly with the positioned ancestor its
  // `position: absolute` resolves against. See `CampDetails`'s doc comment.
  const svgBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = svgBox.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: iw, height: ih } = map.image;
  const height = width ? Math.round((width * ih) / iw) : 0;

  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);

  // Keyboard walk order: the route's camp stops in order, or every camp on
  // the map when there is no route to walk.
  const walkCampIds = useMemo(() => {
    if (route) return route.stops.map((s) => s.campId).filter((id): id is string => !!id);
    return map.camps.map((c) => c.id);
  }, [route, map.camps]);

  const walkCampId = walkIndex != null ? (walkCampIds[walkIndex] ?? null) : null;
  const detailCampId = hoverCamp ?? walkCampId;
  const detailCamp = detailCampId ? (campById.get(detailCampId) ?? null) : null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (!walkCampIds.length) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      setWalkIndex((w) => (w == null ? 0 : Math.min(walkCampIds.length - 1, w + 1)));
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      setWalkIndex((w) => (w == null ? walkCampIds.length - 1 : Math.max(0, w - 1)));
      e.preventDefault();
    } else if (e.key === "Escape") {
      setWalkIndex(null);
      e.preventDefault();
    }
  }

  // Delegated hover: reads the nearest `[data-camp]` ancestor-or-self of
  // whatever sub-element the pointer actually landed on, so moving between
  // two sub-elements of the *same* marker (e.g. the background circle and
  // the foreignObject button) never registers as a leave-then-re-enter —
  // `relatedTarget` is checked against the same closest-match before
  // clearing.
  const handlePointerOver = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const el = (e.target as Element).closest?.("[data-camp]");
    const campId = el?.getAttribute("data-camp");
    if (campId) setHoverCamp((h) => (h === campId ? h : campId));
  }, []);
  const handlePointerOut = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const from = (e.target as Element).closest?.("[data-camp]");
    const campId = from?.getAttribute("data-camp");
    if (!campId) return;
    const to = e.relatedTarget instanceof Element ? e.relatedTarget.closest("[data-camp]") : null;
    if (to === from) return; // moved within the same marker, not a real leave
    setHoverCamp((h) => (h === campId ? null : h));
  }, []);

  // A camp click always shows that camp's details panel (the same effect a
  // keyboard-walk step or a hover gives) — set, never toggled off: a real
  // mouse click always fires `pointerover` first (the delegated handler
  // above already set `hoverCamp` to this same id before the click even
  // lands), so a toggle here would immediately cancel what hover just
  // showed. Leaving the marker (pointerout) or tabbing away still clears it
  // normally. It also forwards to whatever the caller's own `onCampSelect`
  // does with the click (the editor adds/removes a stop; the read-only
  // route page toggles the matching table row — see `CreepMapPlayground`).
  const handleCampClick = useCallback(
    (campId: string) => {
      setHoverCamp(campId);
      onCampSelect?.(campId);
    },
    [onCampSelect],
  );

  const youStartIndex = route?.start ?? 0;
  const opponentStartCount = Math.max(0, map.starts.length - 1);
  const label = `${map.name} minimap, ${map.camps.length} creep camps, your base marked, ${opponentStartCount} opponent base${
    opponentStartCount === 1 ? "" : "s"
  }${route ? `, ${route.stops.length} route stops` : ""}. Arrow keys walk the camps, escape clears the readout.`;

  return (
    <div ref={box} className={cn("panel relative overflow-hidden p-3", className)}>
      {/* No `width === 0` gate: the map must be in the server-rendered HTML
          (a curl gets exactly what a browser gets pre-hydration), so sizing
          is CSS-driven (`viewBox` + `w-full h-auto`, no numeric width/height
          attributes) rather than waiting on the client-only ResizeObserver.
          `width`/`height` state still feeds `CampDetails`'s pixel position,
          which is a hover/focus enhancement, not first-paint content.

          `svgBox` wraps only the `<svg>`, with no padding/border of its
          own, so it's exactly the SVG's rendered box — `CampDetails` is
          anchored inside it (not the padded card above), so a marker at
          `x*width, y*height` and the panel's `position: absolute` agree on
          the same origin. */}
      <div ref={svgBox} className="relative">
        <svg
          viewBox={`0 0 ${iw} ${ih}`}
          role="img"
          aria-label={label}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setWalkIndex(null)}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          className="block h-auto w-full touch-pan-y rounded [outline:none] focus-visible:[outline:2px_solid_var(--wg-gold)] focus-visible:[outline-offset:2px]"
        >
          <image href={map.minimapUrl} x={0} y={0} width={iw} height={ih} preserveAspectRatio="none" />
          {route ? <RoutePath map={map} stops={route.stops} activeStop={activeStop} /> : null}
          {map.starts.map((s, i) => (
            <StartMarker key={i} start={s} iw={iw} ih={ih} isYou={i === youStartIndex} />
          ))}
          {map.camps.map((camp) => {
            const stopIndex = route?.stops.findIndex((s) => s.campId === camp.id) ?? -1;
            const isInteractive = Boolean(onCampSelect) && (!interactiveCampIds || interactiveCampIds.has(camp.id));
            return (
              <CampMarker
                key={camp.id}
                camp={camp}
                imageWidth={iw}
                imageHeight={ih}
                active={activeStop != null && stopIndex === activeStop}
                highlighted={highlightCamps?.has(camp.id) ?? false}
                pressed={stopIndex !== -1}
                onCampSelect={isInteractive ? handleCampClick : undefined}
                asGroup={Boolean(interactiveCampIds)}
              />
            );
          })}
          {/* Mines and shops draw last, over the camps: a gold mine is
              often guarded by (and normalised very close to, sometimes
              almost on top of) the camp that sits on it — see the F008
              handoff — so the icon needs to win the paint order to stay
              visible, not disappear under the camp's own, larger circle. */}
          {map.mines.map((m, i) => (
            <MineMarker key={i} mine={m} iw={iw} ih={ih} />
          ))}
          {map.shops.map((s) => (
            <NeutralMarker key={s.id} shop={s} iw={iw} ih={ih} />
          ))}
        </svg>

        {detailCamp && width ? (
          <CampDetails
            camp={detailCamp}
            x={detailCamp.x * width}
            y={detailCamp.y * height}
            containerWidth={width}
            containerHeight={height}
            markerRadius={radiusFor(detailCamp.level) * (width / iw)}
          />
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {detailCamp
          ? `${campLabel(detailCamp)}: ${detailCamp.band} difficulty, level ${detailCamp.level}, ${detailCamp.xp} xp${
              detailCamp.sleeps ? ", sleeps until attacked" : ""
            }`
          : "No camp selected"}
      </p>
    </div>
  );
}
