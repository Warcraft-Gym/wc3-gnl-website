"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CampCardTrigger, CreepMap as CreepMapType, MapCamp, MapMine, MapShop, MapStart, RouteStop } from "@/lib/creep-routes/types";
import { CampMarker } from "./CampMarker";
import { RoutePath } from "./RoutePath";
import { neutralIconFor } from "@/lib/creep-routes/neutral-icons";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import { cn } from "@/lib/utils";

/** `(hover: none)` covers touch and other coarse pointers — the F012a
 *  spec's exception: no hover behaviour at all there, tap still opens the
 *  card (pinned) via the existing click path. Combined with the `>= 768px`
 *  breakpoint the card itself already uses for popover-vs-sheet, so a
 *  narrow *touch* viewport and a narrow *fine-pointer* window (a small
 *  desktop browser) are told apart correctly: only the latter still hovers. */
function canHoverCard() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover)").matches && window.matchMedia("(min-width: 768px)").matches;
}

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
   *  given. Unset/omitted (every current caller, as of F012-followup-3)
   *  means "every camp" — the editor always left this unset (any camp can
   *  become a stop), and the read-only route page used to pass its own
   *  route's camp ids here to keep every *other* camp inert; that
   *  restriction was the F012-followup-3 bug report ("the camp-card
   *  functionality must be available … for every camp, not only for the
   *  camps that happen to be on the route"), so the route page now leaves
   *  this unset too and uses `deemphasizeOffRoute` for the visual
   *  distinction instead. Kept as a generic restriction mechanism for a
   *  future caller that genuinely needs a subset clickable. */
  interactiveCampIds?: Set<string>;
  /** Renders every interactive marker's outer `<g>` itself as the focusable
   *  click target (`role="button" tabIndex=0`, exactly one `data-camp` per
   *  camp — C-017 depends on that count) instead of the editor's nested
   *  `foreignObject`/`<button>` shape (two `data-camp` per camp: the outer
   *  `<g>` and the button). Independent of `interactiveCampIds`/which camps
   *  are actually interactive: F012-followup-3 split this out once the
   *  route page needed *every* camp clickable while keeping the
   *  single-`data-camp`-per-camp shape it already had. Unset (the editor)
   *  keeps the classic button shape, unchanged. */
  groupMarkers?: boolean;
  /** F012-followup-3: the arrow-key walk visits every camp on the map, not
   *  only `route`'s own stops — the route page wants every camp reachable
   *  now that every camp opens its card, not just the route's own. Unset
   *  (the editor) keeps walking `route`'s own stops in order, unchanged. */
  walkAllCamps?: boolean;
  /** F012-followup-3: gives a camp that ISN'T one of `route`'s own stops a
   *  visually secondary marker (a fainter halo ring, see `CampMarker`) —
   *  used once every camp on the page is interactive, so the route's own
   *  stops (already carrying the numbered badge and the path) still read
   *  as the emphasised ones instead of every camp looking identical. Unset
   *  (the editor) leaves every marker's ring exactly as before. */
  deemphasizeOffRoute?: boolean;
  highlightCamps?: Set<string>;
  /** F012a: pins the camp card for the given camp (already resolved from
   *  `map.camps`) and the DOM element that triggered it, for
   *  anchoring/focus-return — a click (route page), right-click/ⓘ
   *  (editor), or Enter/Space on a focused marker. Only reaches a given
   *  marker when that marker is itself interactive (`isInteractive` below)
   *  — a marker that isn't clickable at all doesn't get a card either. See
   *  `CampMarker`'s doc comment for how the route page (click) and the
   *  editor (right-click) each wire this differently. */
  onCampCardPin?: (camp: MapCamp, el: CampCardTrigger) => void;
  /** F012a: pointer-enter on an interactive marker (`(hover: hover)`, `>=
   *  768px` — coarse pointers and narrow viewports get no hover at all,
   *  per the spec) or an arrow-key walk step opens the card **unpinned**
   *  after ~120ms; ignored once a card is pinned. */
  onCampCardHoverEnter?: (camp: MapCamp, el: CampCardTrigger) => void;
  /** Pointer-leave (or the arrow-key walk moving on/clearing) — closes an
   *  unpinned card after ~180ms unless cancelled first. */
  onCampCardHoverLeave?: () => void;
  /** The camp id the card is currently showing (pinned or not), or null —
   *  every trigger sets its own `aria-expanded` from this (C-025). */
  openCampId?: string | null;
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
 * keys walk the route's camp stops (or every camp, with no route, or every
 * camp when `walkAllCamps` — F012-followup-3, the route page), Escape
 * clears, and an `aria-live` region names the current camp for anyone who
 * isn't hovering it. The real `<table>` fallback for assistive tech is
 * `RouteStepTable`, rendered by the page below this component.
 *
 * Hover uses one delegated `pointerover`/`pointerout` pair on the `<svg>`
 * (`event.target.closest('[data-camp]')`) instead of a handler per marker:
 * a per-marker inline closure would recreate on every render and defeat
 * `CampMarker`'s own `React.memo` the moment any one camp is hovered — see
 * the F009 review, code-b.md item 3.
 *
 * F012a: the lightweight hover panel this used to render itself is retired
 * — hovering (or arrow-key-walking to) an interactive camp now opens the
 * *same* `CampCard` the caller renders, unpinned, via
 * `onCampCardHoverEnter`/`onCampCardHoverLeave` (the caller owns the
 * card's timers — see `useCampCard`). `hoverCamp`/`walkCampId` stay local
 * state here only for the `aria-live` readout, which is unaffected (still
 * names the camp under the pointer or walk step for anyone not looking at
 * the card).
 */
export function CreepMap({
  map,
  route,
  activeStop = null,
  onCampSelect,
  interactiveCampIds,
  groupMarkers = false,
  walkAllCamps = false,
  deemphasizeOffRoute = false,
  highlightCamps,
  onCampCardPin,
  onCampCardHoverEnter,
  onCampCardHoverLeave,
  openCampId = null,
  className,
}: CreepMapProps) {
  const [hoverCamp, setHoverCamp] = useState<string | null>(null);
  const [walkIndex, setWalkIndex] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // The SVG's own box, unpadded — the arrow-key walk's `[data-camp]` lookup
  // below queries inside this same wrapper. The card's map-marker anchor
  // point (via `getBoundingClientRect()` on the marker itself) doesn't
  // depend on this at all — unlike the retired hover panel, which needed
  // the container's own pixel size.
  const svgBox = useRef<HTMLDivElement>(null);

  const { width: iw, height: ih } = map.image;

  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);

  // Keyboard walk order: every camp on the map when `walkAllCamps` (the
  // route page, F012-followup-3 — every camp is interactive there now, so
  // every camp should be walkable too) or there is no route to walk at
  // all; otherwise the route's own camp stops in order (the editor keeps
  // this — its walk order is unaffected by this feature).
  const walkCampIds = useMemo(() => {
    if (walkAllCamps) return map.camps.map((c) => c.id);
    if (route) return route.stops.map((s) => s.campId).filter((id): id is string => !!id);
    return map.camps.map((c) => c.id);
  }, [walkAllCamps, route, map.camps]);

  const walkCampId = walkIndex != null ? (walkCampIds[walkIndex] ?? null) : null;
  const detailCampId = hoverCamp ?? walkCampId;
  const detailCamp = detailCampId ? (campById.get(detailCampId) ?? null) : null;

  // A camp is only ever hover/walk-card-eligible when it's a clickable
  // marker to begin with — same restriction `isInteractive` applies below
  // for the click path (the read-only route page only wants its own
  // route's camps interactive at all).
  const isCampInteractive = useCallback(
    (campId: string) => Boolean(onCampSelect) && (!interactiveCampIds || interactiveCampIds.has(campId)),
    [onCampSelect, interactiveCampIds],
  );

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
    } else if ((e.key === "Enter" || e.key === " ") && walkCampId && isCampInteractive(walkCampId)) {
      // "Enter/Space pins" (F012a spec item 2) — the currently-walked camp.
      // The marker itself has no DOM focus during an arrow-key walk (the
      // `<svg>` does), so the anchor is looked up the same way the
      // hover-open effect below does.
      const camp = campById.get(walkCampId);
      const el = svgBox.current?.querySelector<SVGGElement>(`[data-camp="${walkCampId}"]`) ?? null;
      if (camp && el) onCampCardPin?.(camp, el);
      e.preventDefault();
    }
  }

  // Arrow-key walk "behaves like hover" (F012a spec item 2): every step
  // opens the card unpinned, same as a real pointer hover; walking off the
  // end (or Escape, above) closes it the same way pointer-leave would.
  //
  // `prevWalkCampId` guard (F012b root-cause fix): this effect must fire on
  // real transitions of `walkCampId` only, not on every render where
  // `isCampInteractive`/`campById` merely change *identity* (e.g. a caller
  // whose own `onCampSelect` isn't memoized — the exact bug the editor had:
  // `RouteSubmitForm`'s `onCampSelect` was recreated every render, which
  // cascaded into a fresh `isCampInteractive` on every render, which reran
  // this effect on every render, which — since there's no active walk most
  // of the time — always took the `!walkCampId` branch below and called
  // `onCampCardHoverLeave()` unconditionally. The moment a *pointer* hover
  // opened the card, the resulting re-render (`openCampId` flowing back
  // down) re-fired this effect and closed the card that had just opened,
  // ~180ms later — indistinguishable from "hover does nothing" to a human
  // tester). The ref makes the effect itself correct regardless of caller
  // memoization discipline: it only calls the hover callbacks when the walk
  // step actually changed since the last time this effect ran.
  const prevWalkCampId = useRef<string | null>(null);
  useEffect(() => {
    if (!onCampCardHoverEnter && !onCampCardHoverLeave) return;
    if (prevWalkCampId.current === walkCampId) return;
    prevWalkCampId.current = walkCampId;
    if (!walkCampId || !isCampInteractive(walkCampId)) {
      onCampCardHoverLeave?.();
      return;
    }
    const camp = campById.get(walkCampId);
    const el = svgBox.current?.querySelector<SVGGElement>(`[data-camp="${walkCampId}"]`) ?? null;
    if (camp && el) onCampCardHoverEnter?.(camp, el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkCampId, campById, isCampInteractive]);

  // Delegated hover: reads the nearest `[data-camp]` ancestor-or-self of
  // whatever sub-element the pointer actually landed on, so moving between
  // two sub-elements of the *same* marker (e.g. the background circle and
  // the foreignObject button) never registers as a leave-then-re-enter —
  // `relatedTarget` is checked against the same closest-match before
  // clearing. Also drives the F012a card's own hover-open/close, gated by
  // `canHoverCard()` (the spec's coarse-pointer/narrow-viewport exception —
  // C-025's `data-camp`/`aria-label` counts are untouched by any of this,
  // it only ever calls the *card* callbacks, never changes a marker's own
  // markup).
  const handlePointerOver = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const el = (e.target as Element).closest?.("[data-camp]");
      const campId = el?.getAttribute("data-camp");
      if (!campId) return;
      setHoverCamp((h) => (h === campId ? h : campId));
      if (canHoverCard() && isCampInteractive(campId)) {
        const camp = campById.get(campId);
        if (camp && (el instanceof HTMLElement || el instanceof SVGElement)) onCampCardHoverEnter?.(camp, el);
      }
    },
    [campById, isCampInteractive, onCampCardHoverEnter],
  );
  const handlePointerOut = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const from = (e.target as Element).closest?.("[data-camp]");
      const campId = from?.getAttribute("data-camp");
      if (!campId) return;
      const to = e.relatedTarget instanceof Element ? e.relatedTarget.closest("[data-camp]") : null;
      if (to === from) return; // moved within the same marker, not a real leave
      setHoverCamp((h) => (h === campId ? null : h));
      if (canHoverCard() && isCampInteractive(campId)) onCampCardHoverLeave?.();
    },
    [isCampInteractive, onCampCardHoverLeave],
  );

  // A camp click always shows that camp's details (the same effect a
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

  // Resolves the campId `CampMarker` reports into the full `MapCamp`
  // `CampCard` needs — every caller of this component already has
  // `campById` computed for `onCampSelect` too, but doing it once here
  // saves every single caller from repeating the same lookup.
  const handleCampCardPin = useCallback(
    (campId: string, el: CampCardTrigger) => {
      const camp = campById.get(campId);
      if (camp) onCampCardPin?.(camp, el);
    },
    [campById, onCampCardPin],
  );

  const youStartIndex = route?.start ?? 0;
  const opponentStartCount = Math.max(0, map.starts.length - 1);
  const label = `${map.name} minimap, ${map.camps.length} creep camps, your base marked, ${opponentStartCount} opponent base${
    opponentStartCount === 1 ? "" : "s"
  }${route ? `, ${route.stops.length} route stops` : ""}. Arrow keys walk the camps, escape clears the readout.`;

  return (
    <div ref={box} className={cn("panel relative overflow-hidden p-3", className)}>
      {/* Sizing is CSS-driven (`viewBox` + `w-full h-auto`, no numeric
          width/height state) so the map is complete in the server-rendered
          HTML (a curl gets exactly what a browser gets pre-hydration).

          `svgBox` wraps only the `<svg>`, with no padding/border of its
          own — the arrow-key walk's `[data-camp]` lookup (above) queries
          inside it. */}
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
            const isInteractive = isCampInteractive(camp.id);
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
                onCampCardOpen={isInteractive ? handleCampCardPin : undefined}
                cardOpen={openCampId === camp.id}
                asGroup={groupMarkers}
                secondary={deemphasizeOffRoute && stopIndex === -1}
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
