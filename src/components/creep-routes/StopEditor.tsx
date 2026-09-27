"use client";

import { useEffect, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { deriveRoute } from "@/lib/creep-routes/derive.mjs";
import type { CampCardTrigger, CreepMap, MapCamp } from "@/lib/creep-routes/types";
import type { IconRace } from "@/lib/builds/icons";
import { StopRow, type StopRowData } from "./StopRow";

/** Turns the raw editor rows into the shape `deriveRoute` wants — just
 *  `campId`, in order; the xp/level math only cares about stop *order*. */
function toDerivable(stops: StopRowData[]) {
  return { stops: stops.map((s) => ({ campId: s.campId })) };
}

export function StopEditor({
  map,
  stops,
  setStops,
  iconRace,
  fieldError,
  onOpenCard,
  openCampId,
}: {
  map: CreepMap;
  stops: StopRowData[];
  setStops: React.Dispatch<React.SetStateAction<StopRowData[]>>;
  iconRace?: IconRace;
  fieldError?: (key: string) => string | undefined;
  /** Pins the F012 camp card from a stop row's ⓘ button — see `StopRow`. */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  /** F012a: the camp id the card is currently showing, or null — threaded
   *  to each stop row's ⓘ button (`aria-expanded`, C-025). */
  openCampId?: string | null;
}) {
  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);
  const derived = useMemo(() => deriveRoute(toDerivable(stops), map), [stops, map]);

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
    setStops((rows) => [
      ...rows,
      { id: Date.now() + Math.random(), campId: null, action: "", units: [], note: "", condition: "" },
    ]);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-muted">
          Stops <span className="tnum text-faint">· {stops.length}</span>
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            ref={addBaseActionRef}
            onClick={addBaseAction}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-gold/50 px-2.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold hover:bg-gold/10"
          >
            <Plus size={14} /> Base action
          </button>
        </div>
      </div>

      {stops.length ? (
        <ol className="space-y-2">
          {stops.map((s, i) => (
            <StopRow
              key={s.id}
              index={i}
              stop={s}
              camp={s.campId ? campById.get(s.campId) : undefined}
              iconRace={iconRace}
              error={fieldError ? (k) => fieldError(`stops.${i}.${k}`) : undefined}
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
            />
          ))}
        </ol>
      ) : (
        <p className="rounded border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Click camps on the map to add stops, or add a base action.
        </p>
      )}

      <p className="tnum rounded border border-line/60 bg-surface/40 px-3 py-2 text-xs text-muted">
        {stops.length
          ? `After ${stops.length} stop${stops.length === 1 ? "" : "s"}: hero level ${derived.finalLevel} · ${derived.finalXp} xp`
          : "Add at least two stops to see the level/xp readout."}
      </p>
    </div>
  );
}
