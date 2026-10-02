"use client";

import { useMemo, useRef, useState } from "react";
import { GripVertical, Plus } from "lucide-react";
import { CreepMap } from "./CreepMap";
import { MapLegend, routeLegendMarks } from "./MapLegend";
import { RouteStepTable, type DropProps } from "./RouteStepTable";
import { StopEditBody, type StopRowData } from "./StopEditBody";
import {
  addTarget,
  dropTarget,
  insertAt,
  keyOfRow,
  listAt,
  locate,
  moveRow,
  moveRowTo,
  newRow,
  newSplitRow,
  patchRow,
  placeInList,
  removePath,
  removeRow,
  removeSplit,
  rowAtKey,
  rowsToStops,
  sameCampSequence,
  setArmLabel,
  type DropZone,
} from "./stop-rows";
import { deriveRoute } from "@/lib/creep-routes/derive";
import { addBlocked } from "@/lib/creep-routes/caps.mjs";
import { numberStops, parseKey } from "@/lib/creep-routes/stop-numbers.mjs";
import type { CampCardTrigger, CreepMap as CreepMapType, CreepRoute, MapCamp, Place } from "@/lib/creep-routes/types";
import type { IconRace } from "@/lib/builds/icons";
import { cn } from "@/lib/utils";

const TOOL = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded border px-2.5 text-[0.65rem] font-bold uppercase tracking-wide";
/** Fields whose typing is one undo step until the field loses focus. */
const TEXT_FIELDS = new Set(["note", "condition", "action", "units"]);

/** The drag handle of a row: native HTML drag and drop on a fine pointer; the open stop's arrows are the keyboard and phone path. */
function DragHandle({ onStart, onEnd }: { onStart: () => void; onEnd: () => void }) {
  return (
    <span
      aria-hidden
      draggable
      title="Drag to move"
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", "stop");
        e.dataTransfer.effectAllowed = "move";
        const li = e.currentTarget.closest("li");
        if (li) e.dataTransfer.setDragImage(li, 24, 16);
        onStart();
      }}
      onDragEnd={onEnd}
      className="hidden h-5 w-3.5 cursor-grab place-items-center rounded text-faint hover:text-gold active:cursor-grabbing [@media(pointer:fine)]:grid"
    >
      <GripVertical size={14} />
    </span>
  );
}

/**
 * The slim builder, made of the reader's parts: `CreepMap` in edit mode on the
 * left (sticky on desktop, above the list on a phone) and the reader's stop
 * list (`RouteStepTable`) on the right. One stop is open at a time, the selected
 * one, shared with the map's pulsing node, and its body is the stop's editor
 * (`StopEditBody`). A split is the reader's caption row and tab strip with the
 * builder's controls (`SplitEdit`). Every move has one rule (`editor-rows.mjs`):
 * a map click adds after the selected row in its own list, into the shown path
 * when the split's caption (a tab) is selected, else at the end; a camp already
 * in that list is selected instead. A drag handle on every row moves it (native
 * drag and drop on desktop; a split moves as a block and never into a path); the
 * open stop's arrows move it on a keyboard or phone; its trash removes it.
 * "Remove path" and "Remove split" keep the model whole. Every change but typing
 * calls `remember` first, so the form can undo it; typing in one field is one
 * step until the field loses focus.
 */
export function RouteEditor({
  map,
  stops,
  setStops,
  remember,
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
  /** Called before a change with what it does ("remove stop 3"): the form keeps the undo stack. */
  remember?: (label: string) => void;
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
  const routeStops = useMemo(() => rowsToStops(stops), [stops]);
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
  const numbers = useMemo(() => numberStops(routeStops, choice), [routeStops, choice]);
  const [pointArmed, setPointArmed] = useState(false);
  // A waypoint just added with "+ Waypoint": the next map click puts it on a spot.
  const [pending, setPending] = useState<number | null>(null);
  // The text field being typed in: its edits are one undo step until it loses focus.
  const typing = useRef<string | null>(null);
  // The row being dragged and the drop zone under the pointer.
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<{ zone: string; after: boolean } | null>(null);

  /** A row's name in an undo label: "stop 3", "waypoint", "split". */
  const nameOf = (id: number) => {
    const key = keyOfRow(stops, id);
    const row = key ? rowAtKey(stops, key) : undefined;
    if (!key || !row) return "stop";
    if (row.split) return "split";
    const { index, arm, j } = parseKey(key);
    const label = arm === undefined ? numbers[index]?.label : numbers[index]?.arms?.[arm]?.stops[j!]?.label;
    return label ? `stop ${label}` : "waypoint";
  };
  /** Records an undo step for a change; typing in one field (`field`) is one step until it loses focus. */
  const step = (label: string, field?: string) => {
    if (field && typing.current === field) return;
    typing.current = field ?? null;
    remember?.(label);
  };

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
  // A selected split caption adds into its shown path.
  const selection = selectedId === null ? null : { id: selectedId, arm: tabs[selectedId] ?? 0 };

  // At a cap (`caps.mjs`) the add actions do nothing and the toolbar says so.
  const capLine = addBlocked(stops, "row") ?? addBlocked(stops, "stop");

  /** Adds `row` where an add goes (`addTarget`) and selects it; a camp or attack added to path 2.. of an
   *  "and" split arrives with the hero off. `kind` is what it adds ("stop" numbered, "row" a waypoint or
   *  split): nothing happens at a cap. */
  const add = (row: StopRowData, kind: "stop" | "row", label: string) => {
    if (addBlocked(stops, kind)) return undefined;
    const at = addTarget(stops, selection, Boolean(row.split));
    const split = at.splitId === undefined ? undefined : stops.find((r) => r.id === at.splitId);
    const heroOff = split?.split?.mode === "and" && (at.arm ?? 0) > 0 && Boolean(row.campId || row.place?.kind === "attack");
    step(label);
    setStops(insertAt(stops, at, heroOff ? { ...row, hero: false } : row));
    setSelectedId(row.id);
    if (split && at.arm !== undefined) setTabs((t) => ({ ...t, [split.id]: at.arm! }));
    return row.id;
  };

  // A camp already in the list the click adds to is selected, not added twice; a stop is removed with its trash.
  const onCampClick = (campId: string) => {
    const there = listAt(stops, addTarget(stops, selection)).find((r) => r.campId === campId);
    if (there) select(there.id, true);
    else add(newRow({ campId }), "stop", "add stop");
  };
  const onPlaceSelect = (place: Place) => {
    if (pending !== null && rowAtKey(stops, keyOfRow(stops, pending) ?? "")) {
      setStops((rows) => patchRow(rows, pending, { place }));
      setSelectedId(pending);
    } else {
      add(newRow({ place }), place.kind === "attack" ? "stop" : "row", place.kind === "attack" ? "add stop" : "add waypoint");
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
    const id = add(newRow(), "row", "add waypoint");
    if (id === undefined) return;
    setPending(id);
    setPointArmed(true);
  };
  const addSplit = () => {
    const row = newSplitRow();
    // The new split's caption is selected: the next map clicks fill its first path.
    if (add(row, "row", "add split") !== undefined) setTabs((t) => ({ ...t, [row.id]: 0 }));
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
        onChange={(patch) => {
          const keys = Object.keys(patch);
          step(`edit ${nameOf(row.id)}`, keys.length === 1 && TEXT_FIELDS.has(keys[0]) ? `${row.id}.${keys[0]}` : undefined);
          setStops((rows) => patchRow(rows, row.id, patch));
        }}
        onRemove={() => {
          step(`remove ${nameOf(row.id)}`);
          setStops((rows) => removeRow(rows, row.id));
          setSelectedId(null);
        }}
        onMove={(dir) => {
          step(`move ${nameOf(row.id)}`);
          setStops((rows) => moveRow(rows, row.id, dir));
        }}
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
    const { arms, mode } = row.split;
    const chosen = choice[String(index)] ?? 0;
    const errPath = `stops.${index}.split`;
    return {
      chosen,
      selected: selectedId === row.id,
      onMode: (next: "and" | "or") => {
        if ((next === "and") === (mode === "and")) return;
        step("change split mode");
        setSplit(row.id, { mode: next });
      },
      label: (arm: number) => arms[arm]?.label ?? "",
      onLabel: (arm: number, label: string) => {
        step("edit path label", `${row.id}.label.${arm}`);
        setStops((rows) => setArmLabel(rows, row.id, arm, label));
      },
      onLabelBlur: (arm: number) => setStops((rows) => setArmLabel(rows, row.id, arm, rows.find((r) => r.id === row.id)?.split?.arms[arm]?.label ?? "", true)),
      onAddPath: () => {
        if (addBlocked(stops, "path", row)) return;
        step("add path");
        setSplit(row.id, { arms: [...arms, { id: Date.now() + Math.random(), label: "", stops: [] }] });
      },
      onMove: (dir: -1 | 1) => {
        step("move split");
        setStops((rows) => moveRow(rows, row.id, dir));
      },
      canMoveUp: index > 0,
      canMoveDown: index < stops.length - 1,
      onRemove: () => {
        step("remove split");
        setStops((rows) => removeSplit(rows, row.id, chosen));
        setSelectedId(null);
      },
      sameCamp: sameCampSequence(row.split),
      labelError: (arm: number) => fieldError?.(`${errPath}.arms.${arm}.label`),
    };
  };

  // Under the tabs: the shown path's errors, how to fill it when empty, the path cap and "Remove path".
  const pathTools = (index: number) => {
    const row = stops[index];
    if (!row?.split) return null;
    const arm = choice[String(index)] ?? 0;
    const errPath = `stops.${index}.split`;
    const error = fieldError?.(`${errPath}.arms.${arm}.label`) ?? fieldError?.(`${errPath}.arms.${arm}.stops`) ?? fieldError?.(errPath);
    const empty = !row.split.arms[arm]?.stops.length;
    const pathCap = addBlocked(stops, "path", row);
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem]">
        {empty ? <span className="text-faint">This path is empty: click the map to add its stops, or drag a stop here.</span> : null}
        {error ? <span className="text-loss">{error}</span> : null}
        {pathCap ? <span className="text-faint">{pathCap}</span> : null}
        <button
          type="button"
          onClick={() => {
            step(`remove path ${arm + 1}`);
            setStops((rows) => removePath(rows, row.id, arm));
            setTabs((t) => ({ ...t, [row.id]: 0 }));
          }}
          className="ml-auto text-muted hover:text-loss"
        >
          Remove path
        </button>
      </div>
    );
  };

  // Drag and drop: the row being dragged, and where it would land (`dropTarget`).
  const dragged = drag === null ? undefined : (() => {
    const at = locate(stops, drag);
    return at ? listAt(stops, at)[at.index] : undefined;
  })();
  const zoneId = (zone: DropZone) =>
    zone.kind === "row" ? `r${zone.key}` : zone.kind === "caption" ? `c${zone.index}` : zone.kind === "path" ? `p${zone.index}.${zone.arm}` : "end";
  const zoneRow = (zone: DropZone) =>
    zone.kind === "row" ? rowAtKey(stops, zone.key) : zone.kind === "caption" ? stops[zone.index] : undefined;
  const dropAt = (zone: DropZone, e: React.DragEvent<HTMLLIElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > box.top + box.height / 2;
    return { after, at: dropTarget(stops, { ...zone, after } as DropZone, dragged) };
  };
  const dnd = (zone: DropZone): { handle?: React.ReactNode; props: DropProps } => {
    const row = zoneRow(zone);
    const id = zoneId(zone);
    const lit = over?.zone === id;
    return {
      handle: row ? (
        <DragHandle
          onStart={() => setDrag(row.id)}
          onEnd={() => {
            setDrag(null);
            setOver(null);
          }}
        />
      ) : undefined,
      props: {
        "data-drop": lit ? (zone.kind === "path" || zone.kind === "end" ? "in" : over.after ? "after" : "before") : undefined,
        onDragOver: (e) => {
          if (drag === null) return;
          const { after, at } = dropAt(zone, e);
          // No drop zone lights up where the row cannot go (a split inside a path).
          if (!at) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (!lit || over.after !== after) setOver({ zone: id, after });
        },
        onDrop: (e) => {
          if (drag === null) return;
          e.preventDefault();
          const { at } = dropAt(zone, e);
          if (at) {
            step(`move ${nameOf(drag)}`);
            setStops(moveRowTo(stops, drag, at));
            // A stop dropped into a path that is not shown switches to it, so the result is visible.
            if (at.splitId !== undefined && at.arm !== undefined) setTabs((t) => ({ ...t, [at.splitId!]: at.arm! }));
          }
          setDrag(null);
          setOver(null);
        },
      },
    };
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
            : "Click a camp to add it after the selected stop; a camp already there is selected. Click a base, gold mine or shop to add a waypoint there. Hover a camp to see what is inside; right-click pins the card."}
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
            // A tab selects its split's caption: the next map click adds to that path.
            const split = stops[Number(key)];
            if (split) {
              setTabs((t) => ({ ...t, [split.id]: arm }));
              setSelectedId(split.id);
            }
          }}
          toolbar={toolbar}
          editBody={editBody}
          splitEdit={splitEdit}
          pathTools={pathTools}
          dnd={dnd}
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
