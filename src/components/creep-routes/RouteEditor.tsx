"use client";

import { useMemo } from "react";
import { CreepMap } from "./CreepMap";
import { StopEditor } from "./StopEditor";
import { tryClockSeconds, type StopRowData } from "./StopRow";
import type { CreepMap as CreepMapType } from "@/lib/creep-routes/types";
import type { IconRace } from "@/lib/builds/icons";

/**
 * The click-to-author editor: `CreepMap` in edit mode on the left (every
 * camp is a real button — `onCampSelect` appends a stop, clicking the same
 * camp again appends another, a camp can be revisited), the stop list on
 * the right so the two stay visually tied together, map left / stops
 * right, sticky totals under the list (`StopEditor`).
 */
export function RouteEditor({
  map,
  stops,
  setStops,
  onCampSelect,
  iconRace,
  fieldError,
}: {
  map: CreepMapType;
  stops: StopRowData[];
  setStops: React.Dispatch<React.SetStateAction<StopRowData[]>>;
  onCampSelect: (campId: string) => void;
  iconRace?: IconRace;
  fieldError?: (key: string) => string | undefined;
}) {
  // What the map needs to draw the live path: campId + a stand-in time.
  // Order (not the time value) drives the polyline and the numbered
  // badges, so an unparsed/blank time never breaks the preview.
  const routeForMap = useMemo(
    () => ({ stops: stops.map((s) => ({ campId: s.campId, time: tryClockSeconds(s.timeText) ?? 0 })) }),
    [stops],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <CreepMap map={map} route={routeForMap} onCampSelect={onCampSelect} />
        <p className="mt-2 text-xs text-faint">
          Click a camp to add it as the next stop. Click it again to revisit it later in the route.
        </p>
      </div>
      <StopEditor map={map} stops={stops} setStops={setStops} iconRace={iconRace} fieldError={fieldError} />
    </div>
  );
}
