"use client";

import { useCallback, useMemo, useState } from "react";
import { CreepMap } from "./CreepMap";
import { MapLegend, routeLegendMarks } from "./MapLegend";
import { StopEditor, type ActiveArm } from "./StopEditor";
import { newRow, rowToStop, toggleCamp, updateArm } from "./stop-rows";
import type { StopRowData } from "./StopRow";
import type { CampCardTrigger, CreepMap as CreepMapType, MapCamp, Place } from "@/lib/creep-routes/types";
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
  heroIcon,
  fieldError,
  onOpenCard,
  onHoverEnter,
  onHoverLeave,
  openCampId,
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
  /** The route's hero, the first Bring entry on camp and attack rows. */
  heroIcon?: string;
  fieldError?: (key: string) => string | undefined;
  /** Pins the F012 camp card — forwarded to the map (right-click a
   *  marker, `CampMarker`'s doc comment explains why not a left click
   *  here) and to each stop row's ⓘ button (`StopRow`, a left click, no
   *  competing meaning to protect there). */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  /** F012a: hovering (or arrow-key-walking to) a map marker opens the card
   *  unpinned — forwarded to the map only; stop rows have no hover
   *  behaviour of their own (only their ⓘ button, via `onOpenCard`). */
  onHoverEnter?: (camp: MapCamp, el: CampCardTrigger) => void;
  onHoverLeave?: () => void;
  /** F012a: the camp id the card is currently showing, or null — threaded
   *  to the map (marker `aria-expanded`) and each stop row's ⓘ button. */
  openCampId?: string | null;
}) {
  // What the map needs to draw the live path: campId, in order — order
  // alone drives the polyline and the numbered badges.
  const routeForMap = useMemo(() => ({ stops: stops.map(rowToStop), start }), [stops, start]);

  // The fork way map clicks go into (its "Add stops here" toggle); none means the top level.
  const [activeArm, setActiveArm] = useState<ActiveArm>(null);
  const armOpen = activeArm !== null && stops.some((r) => r.id === activeArm.forkId && r.fork && r.fork.arms[activeArm.arm]);
  const addTo = useCallback(
    (update: (rows: StopRowData[]) => StopRowData[]) =>
      setStops((rows) => (armOpen && activeArm ? updateArm(rows, activeArm.forkId, activeArm.arm, update) : update(rows))),
    [setStops, armOpen, activeArm],
  );
  const onCampClick = useCallback(
    (campId: string) => (armOpen ? addTo((rows) => toggleCamp(rows, campId)) : onCampSelect(campId)),
    [armOpen, addTo, onCampSelect],
  );

  // A start, mine or shop click appends a place stop; so does the next map click while "Point" is armed.
  const [pointArmed, setPointArmed] = useState(false);
  const onPlaceSelect = useCallback(
    (place: Place) => {
      addTo((rows) => [...rows, newRow({ place })]);
      setPointArmed(false);
    },
    [addTo],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <CreepMap
          map={map}
          route={routeForMap}
          onCampSelect={onCampClick}
          onCampCardPin={onOpenCard}
          onCampCardHoverEnter={onHoverEnter}
          onCampCardHoverLeave={onHoverLeave}
          openCampId={openCampId}
          onPlaceSelect={onPlaceSelect}
          pointArmed={pointArmed}
        />
        <MapLegend {...routeLegendMarks(routeForMap.stops)} />
        <p className="mt-2 text-xs text-faint">
          Hover a camp to see what&apos;s inside; click to add it as the next stop; right-click or
          the ⓘ pins the card. Click a base, gold mine or shop to add a stop there.
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
      <StopEditor
        map={map}
        stops={stops}
        setStops={setStops}
        iconRace={iconRace}
        heroIcon={heroIcon}
        fieldError={fieldError}
        onOpenCard={onOpenCard}
        openCampId={openCampId}
        start={start}
        pointArmed={pointArmed}
        onPointToggle={() => setPointArmed((v) => !v)}
        activeArm={armOpen ? activeArm : null}
        onActiveArm={setActiveArm}
      />
    </div>
  );
}
