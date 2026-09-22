"use client";

import { useCallback, useState } from "react";
import { CreepMap } from "@/components/creep-routes/CreepMap";
import { MapLegend } from "@/components/creep-routes/MapLegend";
import { RouteStepTable } from "@/components/creep-routes/RouteStepTable";
import { CampCard } from "@/components/creep-routes/CampCard";
import { useCampCard } from "@/components/creep-routes/useCampCard";
import type { CreepMap as CreepMapType, CreepRoute } from "@/lib/creep-routes/types";

/**
 * The map and the step table share one piece of state — the active stop —
 * lifted here so hovering, focusing or clicking a row in the table lights
 * the same marker on the map, *and* clicking a camp marker on the map
 * selects the matching row (F009: the read-only page was keyboard-only
 * before this — see the F009 review, ux.md item 1). Map left, table right
 * and sticky at `lg`; stacked below.
 *
 * F012/F012a: also owns the camp card's hover/pin state (`useCampCard`) —
 * every trigger (a table row, or a map marker's hover/click/keyboard-walk,
 * see `CampMarker`'s and `CreepMap`'s doc comments) reports up through this
 * one hook, so there's exactly one card open at a time regardless of which
 * side opened it. `card.trigger` is the DOM element that opened it: the
 * card anchors near it on desktop, and the hook returns focus to it when
 * the card closes (Escape, the close button, an outside click, or another
 * camp pinned) — the card itself doesn't know or care which kind of
 * element opened it.
 *
 * F012-followup-3: every camp on the map is now interactive (hover/click
 * opens the card, arrow-key walk reaches it), not only the route's own
 * stops — the user asked for the editor's "every camp works" behaviour on
 * this read-only page too. The route's own stops keep their emphasis
 * three ways, none of which needed touching here since they were already
 * driven by `route` itself, not by which camps were clickable: the
 * numbered badge and the path (`RoutePath`), `aria-pressed`/", on the
 * route" in the marker's own label, and — new — a fainter halo ring on
 * every *other* camp's marker (`deemphasizeOffRoute`, see `CampMarker`'s
 * `secondary` prop).
 */
export function CreepMapPlayground({ map, route }: { map: CreepMapType; route: CreepRoute }) {
  const [activeStop, setActiveStop] = useState<number | null>(null);
  const { card, openCampId, hoverEnter, hoverLeave, cancelHoverLeave, pin, close } = useCampCard();

  // A second click on the same marker clears the selection, same as a
  // second click on the same table row. Clicking a camp that ISN'T one of
  // the route's own stops (every camp is clickable now, F012-followup-3)
  // finds no matching row — `findIndex` returns -1 — and this is a no-op:
  // no table row is selected, nothing crashes.
  const onMarkerSelect = useCallback(
    (campId: string) => {
      const idx = route.stops.findIndex((s) => s.campId === campId);
      if (idx === -1) return;
      setActiveStop((a) => (a === idx ? null : idx));
    },
    [route.stops],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8">
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)]">
        <CreepMap
          map={map}
          route={route}
          activeStop={activeStop}
          onCampSelect={onMarkerSelect}
          groupMarkers
          walkAllCamps
          deemphasizeOffRoute
          onCampCardPin={pin}
          onCampCardHoverEnter={hoverEnter}
          onCampCardHoverLeave={hoverLeave}
          openCampId={openCampId}
        />
        <MapLegend />
      </div>
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)]">
        <RouteStepTable
          route={route}
          map={map}
          active={activeStop}
          onActiveChange={setActiveStop}
          onOpenCard={pin}
          openCampId={openCampId}
        />
      </div>
      {card ? (
        <CampCard
          camp={card.camp}
          anchorEl={card.trigger}
          pinned={card.pinned}
          onClose={close}
          onPointerEnter={cancelHoverLeave}
          onPointerLeave={hoverLeave}
        />
      ) : null}
    </div>
  );
}
