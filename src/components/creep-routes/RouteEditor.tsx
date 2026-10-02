"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CreepMap } from "./CreepMap";
import { MapLegend, routeLegendMarks } from "./MapLegend";
import { RouteStepTable } from "./RouteStepTable";
import { StopEditBody, type StopRowData } from "./StopEditBody";
import { keyOfRow, moveRow, newRow, newSplitRow, patchRow, placeInList, removeRow, rowAtKey, rowToStop, toggleCamp, toggleCampAnywhere, updateArm } from "./stop-rows";
import { deriveRoute } from "@/lib/creep-routes/derive";
import { addBlocked } from "@/lib/creep-routes/caps.mjs";
import { parseKey } from "@/lib/creep-routes/stop-numbers.mjs";
import type { CampCardTrigger, CreepMap as CreepMapType, CreepRoute, MapCamp, Place } from "@/lib/creep-routes/types";
import type { IconRace } from "@/lib/builds/icons";
import { cn } from "@/lib/utils";

/** The path map clicks go into while it is set: a split row's id and the path's index. */
type ActiveArm = { splitId: number; arm: number } | null;

const TOOL = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded border px-2.5 text-[0.65rem] font-bold uppercase tracking-wide";

/** Every row id in the list, paths included. */
function allIds(rows: StopRowData[]): Set<number> {
  return new Set(rows.flatMap((r) => [r.id, ...(r.split?.arms.flatMap((a) => a.stops.map((s) => s.id)) ?? [])]));
}

/**
 * The slim builder, made of the reader's parts: `CreepMap` in edit mode on the
 * left (sticky on desktop, above the list on a phone) and the reader's stop
 * list (`RouteStepTable`) on the right. Every stop is the reader's one-line row;
 * one stop is open at a time, the selected one, shared with the map's pulsing
 * node, and its body is the stop's editor (`StopEditBody`). A split is the
 * reader's caption row and tab strip with the builder's controls (`SplitEdit`):
 * mode chips, labels edited in the tabs, "+ Path" as the last tab, the
 * "next click goes here" dot per path, and the path's tools under the tabs.
 * A map click adds or removes a camp (into the path whose dot is on, else the
 * top level); a start, mine or shop adds a waypoint; "+ Waypoint" adds one and
 * arms the next map click to place it; "+ Split" adds a split.
 */
export function RouteEditor({
  map,
  stops,
  setStops,
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
  /** Index into `map.starts`: your base. Only a map with more than two starts gets a picker. */
  start: number;
  onStartChange: (start: number) => void;
  iconRace?: IconRace;
  /** The route's hero, the first Bring entry on camp and attack stops. */
  heroIcon?: string;
  fieldError?: (key: string) => string | undefined;
  /** Pins the camp card: a right-click on a marker, or the camp name in a stop's row. */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  onHoverEnter?: (camp: MapCamp, el: CampCardTrigger) => void;
  onHoverLeave?: () => void;
  openCampId?: string | null;
}) {
  const routeStops = useMemo(() => stops.map(rowToStop), [stops]);
  const route = useMemo(() => ({ stops: routeStops, start, hero: heroIcon }) as CreepRoute, [routeStops, start, heroIcon]);
  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedKey = selectedId === null ? null : keyOfRow(stops, selectedId);
  const [scrollTo, setScrollTo] = useState<{ key: string } | null>(null);
  // The tab shown per split, by the split row's id (its index moves when rows move).
  const [tabs, setTabs] = useState<Record<number, number>>({});
  const choice = useMemo(
    () => Object.fromEntries(stops.flatMap((r, i) => (r.split ? [[String(i), Math.min(tabs[r.id] ?? 0, r.split.arms.length - 1)]] : []))),
    [stops, tabs],
  );
  const derived = useMemo(() => deriveRoute(route, map, { choice }), [route, map, choice]);
  const [activeArm, setActiveArm] = useState<ActiveArm>(null);
  const armOpen = activeArm !== null && stops.some((r) => r.id === activeArm.splitId && r.split?.arms[activeArm.arm]);
  const [pointArmed, setPointArmed] = useState(false);
  // A waypoint just added with "+ Waypoint": the next map click puts it on a spot.
  const [pending, setPending] = useState<number | null>(null);

  const select = (id: number | null, scroll = false) => {
    setSelectedId(id);
    const key = id === null ? null : keyOfRow(stops, id);
    if (key && scroll) setScrollTo({ key });
    // A stop in a path shows that path's tab.
    if (key?.includes(".")) {
      const { index, arm } = parseKey(key);
      const split = stops[index];
      if (split && arm !== undefined) setTabs((t) => ({ ...t, [split.id]: arm }));
    }
  };
  const selectKey = (key: string) => {
    const row = rowAtKey(stops, key);
    select(row && row.id !== selectedId ? row.id : null);
  };

  // At a cap (`caps.mjs`) the add actions do nothing and the toolbar says so.
  const capLine = addBlocked(stops, "row") ?? addBlocked(stops, "stop");

  /** Applies `update` to the active path's stops, or to the top level; a camp or attack added to
   *  path 2.. of an "and" split arrives with the hero off. Selects the stop it adds. `kind` is what an
   *  add adds ("stop" numbered, "row" a waypoint or split): nothing changes when that is past a cap. */
  const addTo = (update: (rows: StopRowData[]) => StopRowData[], kind: "stop" | "row" = "stop") => {
    const heroOffArm = armOpen && activeArm!.arm > 0 && stops.some((r) => r.id === activeArm!.splitId && r.split?.mode === "and");
    const marked = (rows: StopRowData[]) => {
      const before = new Set(rows.map((r) => r.id));
      return update(rows).map((r) => (heroOffArm && !before.has(r.id) && (r.campId || r.place?.kind === "attack") ? { ...r, hero: false } : r));
    };
    const next = armOpen ? updateArm(stops, activeArm!.splitId, activeArm!.arm, marked) : update(stops);
    const before = allIds(stops);
    const added = [...allIds(next)].find((id) => !before.has(id));
    if (added !== undefined && addBlocked(stops, kind)) return undefined;
    setStops(next);
    if (added !== undefined) {
      setSelectedId(added);
      if (armOpen) setTabs((t) => ({ ...t, [activeArm!.splitId]: activeArm!.arm }));
    }
    return added;
  };

  const onCampClick = (campId: string) => (armOpen ? addTo((rows) => toggleCamp(rows, campId)) : addTo((rows) => toggleCampAnywhere(rows, campId)));
  const onPlaceSelect = (place: Place) => {
    if (pending !== null && rowAtKey(stops, keyOfRow(stops, pending) ?? "")) {
      setStops((rows) => patchRow(rows, pending, { place }));
      setSelectedId(pending);
    } else {
      addTo((rows) => [...rows, newRow({ place })], place.kind === "attack" ? "stop" : "row");
    }
    setPending(null);
    setPointArmed(false);
  };
  const addWaypoint = () => {
    if (pointArmed) {
      setPointArmed(false);
      setPending(null);
      return;
    }
    if (addBlocked(stops, "row")) return;
    const id = addTo((rows) => [...rows, newRow()], "row");
    setPending(id ?? null);
    setPointArmed(true);
  };
  const addSplit = () => {
    if (addBlocked(stops, "row")) return;
    const row = newSplitRow();
    setStops((rows) => [...rows, row]);
    setActiveArm({ splitId: row.id, arm: 0 });
    setSelectedId(null);
  };

  const setSplit = (id: number, split: Partial<NonNullable<StopRowData["split"]>>) =>
    setStops((rows) => rows.map((r) => (r.id === id && r.split ? { ...r, split: { ...r.split, ...split } } : r)));

  /** Field errors of the stop at a key: "stops.2.note", or "stops.2.split.arms.0.stops.1.note" in a path. */
  const errorAt = (key: string) => {
    const { index, arm, j } = parseKey(key);
    const base = arm === undefined ? `stops.${index}` : `stops.${index}.split.arms.${arm}.stops.${j}`;
    return fieldError ? (k: string) => fieldError(`${base}.${k}`) : undefined;
  };

  const editBody = (key: string) => {
    const row = rowAtKey(stops, key);
    if (!row || row.split) return undefined;
    const { index, arm, j } = parseKey(key);
    const d = arm === undefined ? derived.stops[index] : derived.stops[index]?.split?.arms[arm]?.stops[j!];
    // An "and" block is one XP event: its chains carry no level-up marks.
    const inAnd = arm !== undefined && derived.stops[index]?.split?.mode === "and";
    const { index: at, length } = placeInList(stops, row.id);
    return (
      <StopEditBody
        stop={row}
        camp={row.campId ? campById.get(row.campId) : undefined}
        iconRace={iconRace}
        error={errorAt(key)}
        onChange={(patch) => setStops((rows) => patchRow(rows, row.id, patch))}
        onRemove={() => {
          setStops((rows) => removeRow(rows, row.id));
          setSelectedId(null);
        }}
        onMove={(dir) => setStops((rows) => moveRow(rows, row.id, dir))}
        canMoveUp={at > 0}
        canMoveDown={at < length - 1}
        trace={inAnd ? d?.kills.map((k) => ({ ...k, leveledUp: false })) : d?.kills}
        absent={row.hero === false || d?.hero === false}
        heroIcon={heroIcon}
      />
    );
  };

  const splitEdit = (index: number) => {
    const row = stops[index];
    if (!row?.split) return undefined;
    const { arms } = row.split;
    const errPath = `stops.${index}.split`;
    return {
      chosen: choice[String(index)] ?? 0,
      activeArm: armOpen && activeArm?.splitId === row.id ? activeArm.arm : null,
      onDot: (arm: number) => setActiveArm((cur) => (cur?.splitId === row.id && cur.arm === arm ? null : { splitId: row.id, arm })),
      onMode: (mode: "and" | "or" | "xor") => setSplit(row.id, { mode }),
      onLabel: (arm: number, label: string) => setSplit(row.id, { arms: arms.map((x, i) => (i === arm ? { ...x, label } : x)) }),
      onAddPath: () => {
        if (!addBlocked(stops, "path", row)) setSplit(row.id, { arms: [...arms, { id: Date.now() + Math.random(), label: "", stops: [] }] });
      },
      onMove: (dir: -1 | 1) => setStops((rows) => moveRow(rows, row.id, dir)),
      canMoveUp: index > 0,
      canMoveDown: index < stops.length - 1,
      onRemove: () => {
        setStops((rows) => removeRow(rows, row.id));
        if (activeArm?.splitId === row.id) setActiveArm(null);
      },
      labelError: (arm: number) => fieldError?.(`${errPath}.arms.${arm}.label`),
    };
  };

  // Under the tabs: the shown path's errors, its remove button and, when empty, how to fill it.
  const pathTools = (index: number) => {
    const row = stops[index];
    if (!row?.split) return null;
    const { mode, arms } = row.split;
    const arm = choice[String(index)] ?? 0;
    const errPath = `stops.${index}.split`;
    const error = fieldError?.(`${errPath}.arms.${arm}.label`) ?? fieldError?.(`${errPath}.arms.${arm}.stops`) ?? fieldError?.(errPath);
    const notLast = mode === "xor" && index < stops.length - 1;
    const empty = !arms[arm]?.stops.length;
    const pathCap = addBlocked(stops, "path", row);
    if (!error && !notLast && !empty && !pathCap) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem]">
        {empty ? <span className="text-faint">Turn on this path&apos;s dot, then click the map to add its stops.</span> : null}
        {error ? <span className="text-loss">{error}</span> : null}
        {pathCap ? <span className="text-faint">{pathCap}</span> : null}
        {notLast ? <span className="text-loss">Nothing follows this split: move the stops after it into a path, or choose &quot;Choose a path, then continue&quot;.</span> : null}
        {arms.length > 2 ? (
          <button
            type="button"
            onClick={() => {
              setSplit(row.id, { arms: arms.filter((_, i) => i !== arm) });
              setTabs((t) => ({ ...t, [row.id]: 0 }));
              if (activeArm?.splitId === row.id) setActiveArm(null);
            }}
            className="ml-auto text-muted hover:text-loss"
          >
            Remove path {arm + 1}
          </button>
        ) : null}
      </div>
    );
  };

  const toolbar = (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={addWaypoint}
          aria-pressed={pointArmed}
          aria-disabled={!pointArmed && Boolean(addBlocked(stops, "row"))}
          title="Add a waypoint; the next map click puts it on a spot"
          className={cn(TOOL, pointArmed ? "border-gold bg-gold/15 text-fg" : "border-gold/50 text-gold hover:bg-gold/10", "aria-disabled:opacity-40")}
        >
          <Plus size={14} /> Waypoint
        </button>
        <button type="button" onClick={addSplit} aria-disabled={Boolean(addBlocked(stops, "row"))} className={cn(TOOL, "border-gold/50 text-gold hover:bg-gold/10 aria-disabled:opacity-40")}>
          <Plus size={14} /> Split
        </button>
      </div>
      {capLine ? <p className="max-w-[34ch] text-right text-[0.7rem] text-faint">{capLine}</p> : null}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="min-w-0 lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)]">
        <CreepMap
          map={map}
          route={route}
          onCampSelect={onCampClick}
          onCampCardPin={onOpenCard}
          onCampCardHoverEnter={onHoverEnter}
          onCampCardHoverLeave={onHoverLeave}
          openCampId={openCampId}
          onPlaceSelect={onPlaceSelect}
          pointArmed={pointArmed}
          activeStop={selectedKey}
          onStopSelect={(key) => {
            const row = rowAtKey(stops, key);
            if (row) select(row.id, true);
          }}
          choice={choice}
        />
        <MapLegend {...routeLegendMarks(routeStops)} />
        <p className="mt-2 text-xs text-faint">
          {pointArmed
            ? "Click the map to put the waypoint on a spot."
            : "Click a camp to add it, again to remove it. Click a base, gold mine or shop to add a waypoint there. Hover a camp to see what is inside; right-click pins the card."}
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
      <div className="min-w-0">
        <RouteStepTable
          route={route}
          map={map}
          selected={selectedKey}
          open={new Set(selectedKey ? [selectedKey] : [])}
          onSummary={selectKey}
          onChevron={selectKey}
          onExpandAll={() => {}}
          onCollapseAll={() => {}}
          scrollTo={scrollTo}
          onOpenCard={onOpenCard}
          openCampId={openCampId}
          choice={choice}
          onChoose={(key, arm) => {
            const split = stops[Number(key)];
            if (split) setTabs((t) => ({ ...t, [split.id]: arm }));
          }}
          toolbar={toolbar}
          editBody={editBody}
          splitEdit={splitEdit}
          pathTools={pathTools}
          empty={
            <p className="m-4 rounded border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
              Click camps on the map to add stops, or add a waypoint.
            </p>
          }
        />
      </div>
    </div>
  );
}
