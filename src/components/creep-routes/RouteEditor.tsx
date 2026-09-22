"use client";

import { useMemo } from "react";
import { CreepMap } from "./CreepMap";
import { MapLegend } from "./MapLegend";
import { StopEditor } from "./StopEditor";
import type { StopRowData } from "./StopRow";
import type { CreepMap as CreepMapType } from "@/lib/creep-routes/types";
import type { IconRace } from "@/lib/builds/icons";
import { cn } from "@/lib/utils";

/**
 * The click-to-author editor: `CreepMap` in edit mode on the left (every
 * camp is a real button — `onCampSelect` toggles a stop for that camp: adds
 * it if it isn't on the route yet, removes it if it already is, so a camp
 * is on the route at most once via the click path), the stop list on the
 * right so the two stay visually tied together, map left / stops right,
 * sticky totals under the list (`StopEditor`).
 */
export function RouteEditor({
  map,
  stops,
  setStops,
  onCampSelect,
  start,
  onStartChange,
  iconRace,
  fieldError,
}: {
  map: CreepMapType;
  stops: StopRowData[];
  setStops: React.Dispatch<React.SetStateAction<StopRowData[]>>;
  onCampSelect: (campId: string) => void;
  /** Index into `map.starts` — which spawn is your base. Only a map with
   *  more than two starts gets a picker for this; every other map is
   *  implicitly 0 (the only start left after picking a race). */
  start: number;
  onStartChange: (start: number) => void;
  iconRace?: IconRace;
  fieldError?: (key: string) => string | undefined;
}) {
  // What the map needs to draw the live path: campId, in order — order
  // alone drives the polyline and the numbered badges.
  const routeForMap = useMemo(
    () => ({ stops: stops.map((s) => ({ campId: s.campId })), start }),
    [stops, start],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <CreepMap map={map} route={routeForMap} onCampSelect={onCampSelect} />
        <MapLegend />
        <p className="mt-2 text-xs text-faint">
          Click a camp to add it as the next stop; click it again to remove it.
        </p>
        {map.starts.length > 2 ? (
          <div className="mt-3" data-start-picker>
            <p className="font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted">Your spawn</p>
            <div role="radiogroup" aria-label="Your spawn" className="mt-1.5 flex flex-wrap gap-1">
              {map.starts.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={start === i}
                  data-start-option={i}
                  onClick={() => onStartChange(i)}
                  className={cn(
                    "h-8 min-w-8 rounded border px-2 font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] transition-colors",
                    start === i ? "border-loss bg-loss/10 text-fg" : "border-line bg-surface/60 text-muted hover:text-fg",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <StopEditor map={map} stops={stops} setStops={setStops} iconRace={iconRace} fieldError={fieldError} />
    </div>
  );
}
