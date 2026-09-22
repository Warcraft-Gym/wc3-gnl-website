"use client";

import { useCallback, useMemo, useState } from "react";
import { CreepMap } from "@/components/creep-routes/CreepMap";
import { MapLegend } from "@/components/creep-routes/MapLegend";
import { RouteStepTable } from "@/components/creep-routes/RouteStepTable";
import type { CreepMap as CreepMapType, CreepRoute } from "@/lib/creep-routes/types";

/**
 * The map and the step table share one piece of state — the active stop —
 * lifted here so hovering, focusing or clicking a row in the table lights
 * the same marker on the map, *and* clicking a camp marker on the map
 * selects the matching row (F009: the read-only page was keyboard-only
 * before this — see the F009 review, ux.md item 1). Map left, table right
 * and sticky at `lg`; stacked below.
 */
export function CreepMapPlayground({ map, route }: { map: CreepMapType; route: CreepRoute }) {
  const [activeStop, setActiveStop] = useState<number | null>(null);

  // Only the route's own camps are clickable on this page — clicking any
  // other camp on the map would be a dead, inert-looking button, exactly
  // what F009's review flagged for the *whole* map before this feature.
  const routeCampIds = useMemo(
    () => new Set(route.stops.map((s) => s.campId).filter((id): id is string => !!id)),
    [route.stops],
  );

  // A second click on the same marker clears the selection, same as a
  // second click on the same table row.
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
          interactiveCampIds={routeCampIds}
        />
        <MapLegend />
      </div>
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)]">
        <RouteStepTable route={route} map={map} active={activeStop} onActiveChange={setActiveStop} />
      </div>
    </div>
  );
}
