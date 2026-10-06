"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, MapPin, Split } from "lucide-react";
import { CreepMap } from "./CreepMap";
import { MapLegend } from "./MapLegend";
import { RouteStepTable, type DropProps } from "./RouteStepTable";
import { StopEditBody, StopTools, type StopRowData } from "./StopEditBody";
import type { SplitEdit } from "./SplitBlock";
import { ArmedBar, GOLD_BUTTON, NextStopRow } from "./NextStopRow";
import {
  dropTarget,
  insertAt,
  keyOfRow,
  listAt,
  locate,
  moveRow,
  moveRowTo,
  newRow,
  nextStop,
  newSplitRow,
  patchRow,
  removePath,
  removeRow,
  removeSplit,
  ROUTE_END,
  rowAtKey,
  rowsToStops,
  sameCampSequence,
  setArmLabel,
  targetAfterAdd,
  targetAfterRemovePath,
  targetPlace,
  type DropZone,
  type ListPlace,
  type Selection,
  type Target,
  type UndoEntry,
} from "./stop-rows";
import { newId, stepName, stepTarget } from "@/lib/creep-routes/editor-rows.mjs";
import { isPin } from "@/lib/creep-routes/place.mjs";
import { deriveRoute } from "@/lib/creep-routes/derive";
import { addBlocked } from "@/lib/creep-routes/caps.mjs";
import { numberStops, parseKey } from "@/lib/creep-routes/stop-numbers.mjs";
import type { CampCardTrigger, CreepMap as CreepMapType, CreepRoute, MapCamp, Place } from "@/lib/creep-routes/types";
import type { IconRace } from "@/lib/builds/icons";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Fields whose typing is one undo step until the field loses focus. */
const TEXT_FIELDS = new Set(["note", "condition", "action", "units"]);
/** The header's "Waypoint", where focus goes when the control that had it unmounts. */
const WAYPOINT = '[data-focus="waypoint"]';

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
 * (`StopEditBody`). A split shows every path stacked on the lane rail, each
 * with its heading and name (`SplitBlock`). Every move has one rule
 * (`editor-rows.mjs`): the builder keeps one target, the route or one path and a
 * place in it (`targetPlace`), and a map click adds the camp there; a camp already
 * in that list opens instead. Opening a stop never moves the target; "Two paths",
 * a path's tab or its quiet add line, "Continue the route", a new path and a
 * removed path do. The add line (`NextStopRow`) sits at the target with the
 * number that stop takes; "Waypoint" and "Two paths" sit in the list header;
 * the map follows the path that holds it. A drag handle on every row moves it
 * (native drag and drop on desktop; a split moves as a block and never into a
 * path; a path's heading and add row take a drop); the open stop's arrows make
 * the same moves on a keyboard or phone (`stepTarget`), in the stacked order
 * through every path of a split; its trash removes it.
 * "Remove path" and "Remove paths" keep the model whole. Every change but typing
 * calls `remember` first, so the form can undo it; typing in one field is one
 * step until the field loses focus.
 */
export function RouteEditor({
  map,
  stops,
  setStops,
  remember,
  undone,
  start,
  onStartChange,
  iconRace,
  heroIcon,
  fieldError,
  errorKeys,
  onOpenCard,
  onHoverEnter,
  onHoverLeave,
  openCampId,
}: {
  map: CreepMapType;
  stops: StopRowData[];
  setStops: React.Dispatch<React.SetStateAction<StopRowData[]>>;
  /** Called before a change with what it does ("remove stop 3") and the selection then: the form keeps the undo stack. */
  remember?: (label: string, sel: Selection | null) => void;
  /** The entry the form's last undo put back, a new object per undo. */
  undone?: UndoEntry | null;
  /** Index into `map.starts`: your base. Only a map with more than two starts gets a picker. */
  start: number;
  onStartChange: (start: number) => void;
  iconRace?: IconRace;
  /** The route's hero, the first Bring entry on camp and attack stops. */
  heroIcon?: string;
  fieldError?: (key: string) => string | undefined;
  /** The submit check's error keys ("stops.2.action"), a new array per result: the first stop with one opens, so its message shows. */
  errorKeys?: string[];
  /** Pins the camp card: a right-click on a marker, or the camp name in a stop's row. */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  onHoverEnter?: (camp: MapCamp, el: CampCardTrigger) => void;
  onHoverLeave?: () => void;
  openCampId?: string | null;
}) {
  const routeStops = useMemo(() => rowsToStops(stops), [stops]);
  const route = useMemo(() => ({ stops: routeStops, start, hero: heroIcon }) as CreepRoute, [routeStops, start, heroIcon]);
  const campById = useMemo(() => new Map(map.camps.map((c) => [c.id, c])), [map.camps]);

  // The open stop, and the target: where the next add lands. Opening a stop never moves the target.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [target, setTarget] = useState<Target>(ROUTE_END);
  const selectedKey = selectedId === null ? null : keyOfRow(stops, selectedId);
  const [scrollTo, setScrollTo] = useState<{ key: string } | null>(null);
  // The path shown per split, by the split row's id: the map and the numbers after the split follow it.
  const [tabs, setTabs] = useState<Record<number, number>>({});
  const choice = useMemo(
    () => Object.fromEntries(stops.flatMap((r, i) => (r.split ? [[String(i), Math.min(tabs[r.id] ?? 0, r.split.arms.length - 1)]] : []))),
    [stops, tabs],
  );
  const derived = useMemo(() => deriveRoute(route, map, { choice }), [route, map, choice]);
  const numbers = useMemo(() => numberStops(routeStops, choice), [routeStops, choice]);
  // Places mode ("Waypoint"): the map's bases, mines and shops are targets and a click adds a waypoint;
  // with `moveId` the click moves that row instead (`pin` makes it a pin as it moves).
  const [places, setPlaces] = useState<{ moveId: number | null; pin?: boolean } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const narrow = () => !window.matchMedia?.("(min-width: 1024px)").matches;
  /** Enters places mode; below `lg` the map scrolls into view. */
  const enterPlaces = (moveId: number | null, pin?: boolean) => {
    setPlaces({ moveId, pin });
    if (narrow()) mapRef.current?.scrollIntoView?.({ block: "start", behavior: reduced ? "auto" : "smooth" });
  };
  // After an action whose button unmounts, focus goes to this control (a selector in the editor), never to <body>.
  const rootRef = useRef<HTMLDivElement>(null);
  const focusTo = useRef<string | null>(null);
  // The focus target scrolls to the middle too (an added row, below `lg`).
  const scrollFocus = useRef(false);
  useEffect(() => {
    const q = focusTo.current;
    if (!q) return;
    focusTo.current = null;
    const el = rootRef.current?.querySelector<HTMLElement>(q);
    el?.focus();
    if (scrollFocus.current) el?.scrollIntoView?.({ block: "center", behavior: reduced ? "auto" : "smooth" });
    scrollFocus.current = false;
  });
  // Bring and the condition of a camp stop stay open once opened, by row id, so they survive a move.
  const [opened, setOpened] = useState<Record<string, true>>({});
  // Escape in the editor leaves places mode; an Escape a popover already took (`defaultPrevented`)
  // or one outside the editor does not.
  useEffect(() => {
    if (!places) return;
    const back = places.moveId != null ? `[data-move-way="${places.moveId}"]` : WAYPOINT;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || !rootRef.current?.contains(e.target as Node)) return;
      focusTo.current = back;
      setPlaces(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [places]);
  // The text field being typed in: its edits are one undo step until it loses focus.
  const typing = useRef<string | null>(null);
  // The row being dragged and the drop zone under the pointer.
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<{ zone: string; after: boolean } | null>(null);
  // After an arrow move, focus goes back to the moved stop's arrow: its row remounts at the new place.
  const refocus = useRef<-1 | 1 | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dir = refocus.current;
    if (dir === null) return;
    refocus.current = null;
    const arrows = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-move]:not(:disabled)") ?? [])];
    (arrows.find((b) => b.dataset.move === String(dir)) ?? arrows[0])?.focus();
  }, [stops]);

  /** A row's name in an undo label: "stop 3", "waypoint", "paths". */
  const nameOf = (id: number) => {
    const key = keyOfRow(stops, id);
    const row = key ? rowAtKey(stops, key) : undefined;
    if (!key || !row) return "stop";
    if (row.split) return "paths";
    const { index, arm, j } = parseKey(key);
    const label = arm === undefined ? numbers[index]?.label : numbers[index]?.arms?.[arm]?.stops[j!]?.label;
    return label ? `stop ${label}` : "waypoint";
  };
  /** Records an undo step for a change; typing in one field (`field`) is one step until it loses focus. */
  const step = (label: string, field?: string) => {
    if (field && typing.current === field) return;
    typing.current = field ?? null;
    remember?.(label, { id: selectedId, target });
  };
  // An undo puts the target back, and the open stop when it is gone (undo of "add stop").
  // Adjusted during render, like the errors below.
  const [seenUndo, setSeenUndo] = useState(undone);
  if (undone !== seenUndo) {
    setSeenUndo(undone);
    if (undone?.sel) {
      const t = undone.sel.target;
      setTarget(t);
      if (t.splitId !== undefined) setTabs((tabs) => ({ ...tabs, [t.splitId!]: t.arm ?? 0 }));
    }
    if (selectedId !== null && !locate(stops, selectedId)) setSelectedId(undone?.sel?.id ?? null);
    if (places?.moveId != null && !locate(stops, places.moveId)) setPlaces(null);
  }

  /** Opens a row (the target stays); leaves places mode. */
  const select = (id: number | null, scroll = false) => {
    setSelectedId(id);
    setPlaces(null);
    const key = id === null ? null : keyOfRow(stops, id);
    if (key && scroll) setScrollTo({ key });
    // A stop in a path: the map follows that path.
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
  // After a submit check, the first stop with an error opens and scrolls into view: its message
  // sits in the stop's body, which is hidden while the stop is closed.
  const firstError = (errorKeys ?? [])
    .map((k) => /^stops\.(\d+)(?:\.split\.arms\.(\d+)\.stops\.(\d+))?\.(?!split\b)/.exec(k))
    .find(Boolean);
  const errorKey = firstError ? (firstError[2] === undefined ? firstError[1] : `${firstError[1]}.${"abc"[Number(firstError[2])]}.${firstError[3]}`) : null;
  // Adjusted during render (not in an effect): only a new submit result moves the selection.
  const [seenErrors, setSeenErrors] = useState(errorKeys);
  if (errorKeys !== seenErrors) {
    setSeenErrors(errorKeys);
    const row = errorKey ? rowAtKey(stops, errorKey) : undefined;
    if (row) select(row.id, true);
  }

  // At a cap (`caps.mjs`) the add actions do nothing and the next-stop row says so.
  const capLine = addBlocked(stops, "row") ?? addBlocked(stops, "stop");
  // The add line sits at the target, with the number that stop will take.
  const at = targetPlace(stops, target);
  const next = nextStop(stops, at, tabs);
  const slot =
    at.splitId === undefined
      ? { index: at.index, label: next.label }
      : { index: stops.findIndex((r) => r.id === at.splitId), arm: at.arm, j: at.index, label: next.label };

  // The map's preview of a camp click: a leg from the last place before the target in its list (a paths
  // block or the list's start ends the search), skipped for camps already in that list.
  const preview = (() => {
    const list = listAt(stops, at) as StopRowData[];
    let from: StopRowData | null = null;
    for (let i = at.index - 1; i >= 0 && !from; i--) {
      const r = list[i];
      if (r.split) break;
      if (r.campId || (r.place && !isPin(r))) from = r;
    }
    return { from, label: next.label, skip: new Set(list.flatMap((r) => (r.campId ? [r.campId] : []))) };
  })();

  /** Adds `row` at the target and opens it; a paths block always goes at the end of the route. A camp or
   *  attack added to path 2.. of an "and" block arrives with the hero off. `kind` is what it adds ("stop"
   *  numbered, "row" a waypoint or paths): nothing happens at a cap. */
  const add = (row: StopRowData, kind: "stop" | "row", label: string) => {
    if (addBlocked(stops, kind)) return undefined;
    const at = row.split ? { index: stops.length } : targetPlace(stops, target);
    const split = at.splitId === undefined ? undefined : stops.find((r) => r.id === at.splitId);
    const heroOff = split?.split?.mode === "and" && (at.arm ?? 0) > 0 && Boolean(row.campId || row.place?.kind === "attack");
    step(label);
    setStops(insertAt(stops, at, heroOff ? { ...row, hero: false } : row));
    setSelectedId(row.id);
    if (!row.split) setTarget(targetAfterAdd(target));
    if (split && at.arm !== undefined) setTabs((t) => ({ ...t, [split.id]: at.arm! }));
    return row.id;
  };

  // A camp already in the list the click adds to is selected, not added twice; a stop is removed with its trash.
  const onCampClick = (campId: string) => {
    if (places) return;
    const there = listAt(stops, at).find((r) => r.campId === campId);
    if (there) select(there.id, true);
    else add(newRow({ campId }), "stop", "add stop");
  };
  // Places mode: a click adds a waypoint on the route at the target (`kindForClick`; their base an attack),
  // or moves the row being moved there, keeping its text, kind and Bring. Then the row opens with focus in its text.
  const onPlaceSelect = (picked: Place) => {
    const mv = places?.moveId;
    const row = mv != null ? rowAtKey(stops, keyOfRow(stops, mv) ?? "") : undefined;
    setPlaces(null);
    if (mv != null && row) {
      const pin = places?.pin ?? isPin(row);
      const kind = row.place?.kind ?? picked.kind;
      const place: Place = { ...picked, kind: pin && kind === "attack" ? "scout" : kind };
      step("move waypoint");
      setStops((rows) => patchRow(rows, mv, { place, hero: pin ? false : row.hero }));
      setSelectedId(mv);
      focusTo.current = `[data-move-way="${mv}"]`;
      return;
    }
    const attack = picked.kind === "attack";
    if (add(newRow({ place: picked }), attack ? "stop" : "row", attack ? "add stop" : "add waypoint") !== undefined) focusText();
  };
  /** After an add: focus in the new row's text; below `lg` the row scrolls into view. */
  const focusText = () => {
    focusTo.current = "[data-way-text]";
    scrollFocus.current = narrow();
  };
  /** Leaves places mode; focus goes back to the control that entered it. */
  const leavePlaces = () => {
    focusTo.current = places?.moveId != null ? `[data-move-way="${places.moveId}"]` : WAYPOINT;
    setPlaces(null);
  };
  /** "Waypoint" toggles places mode; nothing is inserted until a click. */
  const toggleWaypoint = () => {
    if (places) return leavePlaces();
    if (addBlocked(stops, "row")) return;
    enterPlaces(null);
  };
  /** "No place": an action row at the target, focus in its text. */
  const addNoPlace = () => {
    if (addBlocked(stops, "stop")) return;
    setPlaces(null);
    if (add(newRow(), "stop", "add action") !== undefined) focusText();
  };
  /** "Two paths": a choose-one block with two unnamed paths at the end of the route, one undo step;
   *  path A becomes the target. With a mouse its name field takes focus; map clicks still add. */
  const addPaths = () => {
    if (addBlocked(stops, "row")) return;
    setPlaces(null);
    const row = newSplitRow("or");
    if (add(row, "row", "add paths") === undefined) return;
    setTabs((t) => ({ ...t, [row.id]: 0 }));
    setTarget({ splitId: row.id, arm: 0, pos: null });
    if (window.matchMedia?.("(pointer: fine)").matches) focusTo.current = `[data-path-field="${row.id}.0"]`;
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
        trace={inAnd ? d?.kills.map((k) => ({ ...k, leveledUp: false })) : d?.kills}
        absent={row.hero === false || d?.hero === false}
        heroIcon={heroIcon}
        opened={{ bring: Boolean(opened[`${row.id}.bring`]), condition: Boolean(opened[`${row.id}.condition`]) }}
        onOpen={(part) => setOpened((o) => (o[`${row.id}.${part}`] ? o : { ...o, [`${row.id}.${part}`]: true }))}
        onArm={(type) => enterPlaces(row.id, type === "pin")}
      />
    );
  };

  /** The open stop's move and remove buttons, on its summary line. */
  const stopTools = (key: string) => {
    const row = rowAtKey(stops, key);
    if (!row || row.split) return undefined;
    const target = (dir: -1 | 1) => stepTarget(stops, row.id, dir) as ListPlace | null;
    return (
      <StopTools
        onRemove={() => {
          step(`remove ${nameOf(row.id)}`);
          setStops((rows) => removeRow(rows, row.id));
          setSelectedId(null);
          focusTo.current = WAYPOINT;
        }}
        onMove={(dir) => {
          const at = target(dir);
          if (!at) return;
          step(`move ${nameOf(row.id)}`);
          setStops(moveRowTo(stops, row.id, at));
          if (at.splitId !== undefined && at.arm !== undefined) setTabs((t) => ({ ...t, [at.splitId!]: at.arm! }));
          refocus.current = dir;
        }}
        canMoveUp={target(-1) !== null}
        canMoveDown={target(1) !== null}
        upLabel={stepName(stops, row.id, -1)}
        downLabel={stepName(stops, row.id, 1)}
      />
    );
  };

  const splitEdit = (index: number): SplitEdit | undefined => {
    const row = stops[index];
    if (!row?.split) return undefined;
    const { arms, mode } = row.split;
    const errPath = `stops.${index}.split`;
    return {
      onMode: (next: "and" | "or") => {
        if ((next === "and") === (mode === "and")) return;
        step("change kind");
        setSplit(row.id, { mode: next });
      },
      label: (arm: number) => arms[arm]?.label ?? "",
      onLabel: (arm: number, label: string) => {
        step("edit path label", `${row.id}.label.${arm}`);
        setStops((rows) => setArmLabel(rows, row.id, arm, label));
      },
      onLabelBlur: (arm: number) => setStops((rows) => setArmLabel(rows, row.id, arm, rows.find((r) => r.id === row.id)?.split?.arms[arm]?.label ?? "", true)),
      pathError: (arm: number) => fieldError?.(`${errPath}.arms.${arm}.label`) ?? fieldError?.(`${errPath}.arms.${arm}.stops`),
      error: fieldError?.(errPath),
      blockId: row.id,
      onAddPath: addBlocked(stops, "path", row)
        ? undefined
        : () => {
            step("add path");
            setSplit(row.id, { arms: [...arms, { id: newId(), label: "", stops: [] }] });
            setTabs((t) => ({ ...t, [row.id]: arms.length }));
            setTarget({ splitId: row.id, arm: arms.length, pos: null });
            focusTo.current = `[data-path-field="${row.id}.${arms.length}"]`;
          },
      // Removing one of two paths turns the block into the other path's stops, in its place (`removePath`).
      onRemovePath: (arm: number) => {
        step(`remove path ${mode === "and" ? arm + 1 : "ABC"[arm]}`);
        setTarget(targetAfterRemovePath(stops, target, row.id, arm));
        setStops((rows) => removePath(rows, row.id, arm));
        setTabs((t) => ({ ...t, [row.id]: 0 }));
        focusTo.current = WAYPOINT;
      },
      // A path's tab or its quiet add line: the path shows, the map follows it, and it becomes the target.
      onAddStops: (arm: number) => {
        setTabs((t) => ({ ...t, [row.id]: arm }));
        setTarget({ splitId: row.id, arm, pos: null });
      },
      onMove: (dir: -1 | 1) => {
        step("move paths");
        setStops((rows) => moveRow(rows, row.id, dir));
      },
      canMoveUp: index > 0,
      canMoveDown: index < stops.length - 1,
      // The caption's trash always keeps path A; a path heading's x removes any other.
      onRemove: () => {
        step("remove paths");
        if (target.splitId === row.id) setTarget(ROUTE_END);
        setStops((rows) => removeSplit(rows, row.id, 0));
        setSelectedId(null);
        focusTo.current = WAYPOINT;
      },
      removeLabel: `Remove paths, keep path ${mode === "and" ? 1 : "A"}`,
      sameCamp: sameCampSequence(row.split),
    };
  };

  // Drag and drop: the row being dragged, and where it would land (`dropTarget`).
  const dragged = drag === null ? undefined : (() => {
    const at = locate(stops, drag);
    return at ? listAt(stops, at)[at.index] : undefined;
  })();
  const zoneId = (zone: DropZone) =>
    zone.kind === "row" ? `r${zone.key}` : zone.kind === "caption" ? `c${zone.index}` : zone.kind === "path" ? `p${zone.index}.${zone.arm}.${zone.at ?? 0}` : "end";
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
            // A stop dropped into a path: the map follows that path.
            if (at.splitId !== undefined && at.arm !== undefined) setTabs((t) => ({ ...t, [at.splitId!]: at.arm! }));
          }
          setDrag(null);
          setOver(null);
        },
      },
    };
  };

  return (
    <div ref={rootRef} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div ref={mapRef} className="min-w-0 scroll-mt-[calc(var(--wg-header-h)+0.5rem)] lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)]">
        <CreepMap
          map={map}
          route={route}
          onCampSelect={onCampClick}
          onCampCardPin={onOpenCard}
          onCampCardHoverEnter={onHoverEnter}
          onCampCardHoverLeave={onHoverLeave}
          openCampId={openCampId}
          onPlaceSelect={onPlaceSelect}
          placesMode={places !== null}
          activeStop={selectedKey}
          onStopSelect={(key) => {
            const row = rowAtKey(stops, key);
            if (row) select(row.id, true);
          }}
          choice={choice}
          preview={preview}
        />
        {places ? <ArmedBar move={places.moveId !== null} noPlaceCap={Boolean(addBlocked(stops, "stop"))} onNoPlace={addNoPlace} onCancel={leavePlaces} /> : null}
        <MapLegend />
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
      <div ref={listRef} className="min-w-0">
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
          editBody={editBody}
          stopTools={stopTools}
          splitEdit={splitEdit}
          dnd={dnd}
          slot={slot}
          onContinue={() => setTarget(ROUTE_END)}
          tools={
            <span className="flex shrink-0 gap-1.5">
              <button type="button" onClick={toggleWaypoint} aria-pressed={places !== null && places.moveId === null} aria-disabled={Boolean(addBlocked(stops, "row"))} data-focus="waypoint" className={cn(GOLD_BUTTON, "aria-pressed:bg-gold/15")}>
                <MapPin aria-hidden size={14} /> Waypoint
              </button>
              <button type="button" onClick={addPaths} aria-disabled={Boolean(addBlocked(stops, "row"))} data-focus="paths" className={GOLD_BUTTON}>
                <Split aria-hidden size={14} /> Two paths
              </button>
            </span>
          }
          slotRow={<NextStopRow label={next.label} capLine={capLine} />}
        />
      </div>
    </div>
  );
}
