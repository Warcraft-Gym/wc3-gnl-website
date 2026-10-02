"use client";

import { useEffect, useMemo, useRef } from "react";
import { Crosshair, GitFork, Plus } from "lucide-react";
import { deriveRoute, type DerivedStop } from "@/lib/creep-routes/derive";
import { placeName } from "@/lib/creep-routes/place.mjs";
import { numberStops } from "@/lib/creep-routes/stop-numbers.mjs";
import { cn } from "@/lib/utils";
import type { CampCardTrigger, CreepMap, MapCamp } from "@/lib/creep-routes/types";
import type { IconRace } from "@/lib/builds/icons";
import { StopRow, type StopRowData } from "./StopRow";
import { ForkRow } from "./ForkRow";
import { newRow, rowToStop } from "./stop-rows";

/** The way map clicks go into while it is set: a fork row's id and the arm's index. */
export type ActiveArm = { forkId: number; arm: number } | null;

export function StopEditor({
  map,
  stops,
  setStops,
  iconRace,
  heroIcon,
  fieldError,
  onOpenCard,
  openCampId,
  start = 0,
  pointArmed = false,
  onPointToggle,
  depth = 0,
  labels,
  derivedStops,
  errorPath = "stops",
  activeArm = null,
  onActiveArm,
}: {
  map: CreepMap;
  stops: StopRowData[];
  setStops: React.Dispatch<React.SetStateAction<StopRowData[]>>;
  iconRace?: IconRace;
  /** The route's hero, the first Bring entry on camp and attack rows. */
  heroIcon?: string;
  fieldError?: (key: string) => string | undefined;
  /** Pins the F012 camp card from a stop row's ⓘ button — see `StopRow`. */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  /** F012a: the camp id the card is currently showing, or null — threaded
   *  to each stop row's ⓘ button (`aria-expanded`, C-025). */
  openCampId?: string | null;
  /** Index into `map.starts` of your base, so a start place reads "your base". */
  start?: number;
  /** The "Point" toggle: armed, the next map click adds a point place stop. */
  pointArmed?: boolean;
  onPointToggle?: () => void;
  /** 1 inside a fork's way: no "+ Fork", no "Point", no level readout. */
  depth?: 0 | 1;
  /** Inside a way: each stop's number ("3a"), from the route's `numberStops`. */
  labels?: string[];
  /** Inside a way: its stops' derived trace, from the whole route's `deriveRoute`. */
  derivedStops?: DerivedStop[];
  /** Where this list's field errors live: "stops", or "stops.2.fork.arms.0.stops" in a way. */
  errorPath?: string;
  /** The way map clicks go into, and its setter (a fork row's "Add stops here" toggle). */
  activeArm?: ActiveArm;
  onActiveArm?: (arm: ActiveArm) => void;
}) {
  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);
  const routeStops = useMemo(() => stops.map(rowToStop), [stops]);
  const own = useMemo(() => (derivedStops ? null : deriveRoute({ stops: routeStops }, map)), [derivedStops, routeStops, map]);
  const derived = { stops: derivedStops ?? own?.stops ?? [], finalLevel: own?.finalLevel ?? 1, finalXp: own?.finalXp ?? 0 };
  const numbers = useMemo(() => numberStops(routeStops), [routeStops]);

  // Focus after removing a stop: the next stop's Remove button, or the
  // previous one if the removed stop was last, or "+ Base action" when the
  // list becomes empty — never silently to `<body>` (F009, code-b.md
  // item 4). `pendingFocusIndex` is the removed stop's own array index:
  // after the filter, whatever was one past it (the "next" stop) has
  // shifted down into that same index, so a single `min(idx, length - 1)`
  // covers both "next" and "previous stop is now last" in one line.
  const removeButtonRefs = useRef(new Map<number, HTMLButtonElement | null>());
  const addBaseActionRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocusIndex = useRef<number | null>(null);

  useEffect(() => {
    const idx = pendingFocusIndex.current;
    if (idx == null) return;
    pendingFocusIndex.current = null;
    if (!stops.length) {
      addBaseActionRef.current?.focus();
      return;
    }
    const target = stops[Math.min(idx, stops.length - 1)];
    removeButtonRefs.current.get(target.id)?.focus();
  }, [stops]);

  function update(id: number, patch: Partial<StopRowData>) {
    setStops((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function move(index: number, dir: -1 | 1) {
    setStops((rows) => {
      const j = index + dir;
      if (j < 0 || j >= rows.length) return rows;
      const copy = [...rows];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  }
  function remove(id: number) {
    pendingFocusIndex.current = stops.findIndex((r) => r.id === id);
    setStops((rows) => rows.filter((r) => r.id !== id));
  }
  function addBaseAction() {
    setStops((rows) => [...rows, newRow()]);
  }
  // A new fork starts as "Choose a way" with two empty ways; map clicks go into its first.
  function addFork() {
    const row = newRow({
      fork: { mode: "either", arms: [0, 1].map((a) => ({ id: Date.now() + Math.random() + a, label: "", stops: [] })) },
    });
    setStops((rows) => [...rows, row]);
    onActiveArm?.({ forkId: row.id, arm: 0 });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {depth === 0 ? (
          <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted">
            Stops <span className="tnum text-faint">· {stops.length}</span>
          </h3>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            ref={addBaseActionRef}
            onClick={addBaseAction}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-gold/50 px-2.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold hover:bg-gold/10"
          >
            <Plus size={14} /> Base action
          </button>
          {depth === 0 ? (
            <button
              type="button"
              onClick={addFork}
              className="inline-flex h-8 items-center gap-1.5 rounded border border-gold/50 px-2.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold hover:bg-gold/10"
            >
              <GitFork size={14} /> Fork
            </button>
          ) : null}
          {depth === 0 && onPointToggle ? (
            <button
              type="button"
              onClick={onPointToggle}
              aria-pressed={pointArmed}
              title="Click the map once to add a stop at that point"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-[0.65rem] font-bold uppercase tracking-wide",
                pointArmed ? "border-gold bg-gold/15 text-fg" : "border-gold/50 text-gold hover:bg-gold/10",
              )}
            >
              <Crosshair size={14} /> Point
            </button>
          ) : null}
        </div>
      </div>

      {stops.length ? (
        <ol className="space-y-2">
          {stops.map((s, i) => s.fork ? (
            <ForkRow
              key={s.id}
              row={{ ...s, fork: s.fork }}
              number={numbers[i].label}
              map={map}
              setStops={setStops}
              iconRace={iconRace}
              heroIcon={heroIcon}
              fieldError={fieldError}
              errorPath={`${errorPath}.${i}.fork`}
              onRemove={() => remove(s.id)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < stops.length - 1}
              removeButtonRef={(el) => {
                if (el) removeButtonRefs.current.set(s.id, el);
                else removeButtonRefs.current.delete(s.id);
              }}
              armLabels={(numbers[i].arms ?? []).map((a) => a.stops.map((n) => n.label))}
              derived={derived.stops[i]}
              onOpenCard={onOpenCard}
              openCampId={openCampId}
              start={start}
              activeArm={activeArm}
              onActiveArm={onActiveArm}
            />
          ) : (
            <StopRow
              key={s.id}
              index={i}
              number={labels?.[i] ?? numbers[i].label}
              stop={s}
              camp={s.campId ? campById.get(s.campId) : undefined}
              iconRace={iconRace}
              error={fieldError ? (k) => fieldError(`${errorPath}.${i}.${k}`) : undefined}
              onChange={(patch) => update(s.id, patch)}
              onRemove={() => remove(s.id)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < stops.length - 1}
              removeButtonRef={(el) => {
                if (el) removeButtonRefs.current.set(s.id, el);
                else removeButtonRefs.current.delete(s.id);
              }}
              onOpenCard={onOpenCard}
              cardOpen={Boolean(s.campId) && s.campId === openCampId}
              trace={derived.stops[i]?.kills}
              absent={s.hero === false || derived.stops[i]?.hero === false}
              heroIcon={heroIcon}
              placeLabel={s.place ? placeName(map, s.place, start) : undefined}
            />
          ))}
        </ol>
      ) : depth === 0 ? (
        <p className="rounded border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Click camps on the map to add stops, or add a base action.
        </p>
      ) : (
        <p className="rounded border border-dashed border-line px-3 py-3 text-center text-xs text-muted">
          Pick this way, then click the map to add its stops.
        </p>
      )}

      {depth === 0 ? (
        <p className="tnum rounded border border-line/60 bg-surface/40 px-3 py-2 text-xs text-muted">
          {stops.length
            ? `After ${stops.length} stop${stops.length === 1 ? "" : "s"}: hero level ${derived.finalLevel} · ${derived.finalXp} xp`
            : "Add at least two stops to see the level/xp readout."}
        </p>
      ) : null}
    </div>
  );
}
