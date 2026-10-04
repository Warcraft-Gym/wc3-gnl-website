"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { deriveRoute } from "@/lib/creep-routes/derive";
import { countStops, flatStops, numberStops, parseKey, stopKeys } from "@/lib/creep-routes/stop-numbers.mjs";
import { builderRows, routeRows } from "@/lib/creep-routes/route-rows.mjs";
import { isWaypoint } from "@/lib/creep-routes/place.mjs";
import type { CampCardTrigger, CreepMap, CreepRoute, MapCamp, RouteStop } from "@/lib/creep-routes/types";
import { StopBlock } from "./StopBlock";
import { cn } from "@/lib/utils";
import { DROP, JoinRow, SlotRail, SplitRow, StopRail, type RailLine } from "./LaneRail";
import { AddThirdPath, AfterSplit, PathAdd, PathHead, PathSep, SplitCaption, type SplitEdit } from "./SplitBlock";
import type { DropZone } from "./stop-rows";

/** The builder's drop handlers on a row (`RouteEditor`); `data-drop` lights the drop line. */
export type DropProps = Pick<React.LiHTMLAttributes<HTMLLIElement>, "onDragOver" | "onDrop"> & { "data-drop"?: string };
/** The builder's drag and drop for one zone: the row's handle and its drop handlers. */
export type Dnd = (zone: DropZone) => { handle?: React.ReactNode; props: DropProps };

/** One row of the flat lane list, see `route-rows.mjs`. */
type LaneRow =
  | { type: "stop"; key: string; label: string; stop: RouteStop; lane: string; lines: RailLine[]; node?: number; panel?: string; block?: string }
  | { type: "split"; key: string; stop: RouteStop; index: number; mode: "and" | "or" | "xor"; lanes: { lane: string; off: boolean }[]; lines: RailLine[] }
  | { type: "join"; key: string; index: number; mode: "and" | "or" | "xor"; lanes: { lane: string; off: boolean }[] };

/** One row of the builder's list, see `builderRows` in `route-rows.mjs`; `group` is the split a row belongs to. */
type Lanes = { lane: string; off: boolean }[];
type BuilderRow =
  | ((LaneRow & { type: "stop" | "split" }) & { group?: string })
  | { type: "slot"; key: string; label: string; lane: string; lines: RailLine[]; group?: string }
  | { type: "head"; key: string; index: number; arm: number; lane: string; mode: string; here: boolean; count: number; waypoints: number; lines: RailLine[]; group: string }
  | { type: "sep"; key: string; mode: string; lines: RailLine[]; group: string }
  | { type: "add"; key: string; index: number; arm: number; mode: string; length: number; lines: RailLine[]; group: string }
  | { type: "more"; key: string; index: number; lines: RailLine[]; group?: undefined }
  | { type: "after"; key: string; index: number; mode: string; lanes: Lanes; joins: boolean; follows: boolean; slotAfter: boolean; lines: RailLine[]; group?: undefined };

/**
 * The route as an ordered list of stops, each a disclosure. Both states are
 * owned by the page (`stop-view.mjs`): `selected` (the gold dot, the map's
 * pulsing node) and `open` (expanded stops). The summary line is a button
 * over the whole line that selects and opens its stop (`onSummary`); the
 * chevron at its right edge only opens or closes it (`onChevron`); the camp
 * label inside it is its own button that pins the camp card. `scrollTo`
 * scrolls a stop into view (a selection from the map). Stops are named by
 * the keys of `stop-numbers.mjs`; every stop, a split's arms' stops too, is a
 * flat row with the lane rail (`LaneRail`), except a guide's one stop
 * (`only`). Blocks carry `data-stop` (the stop's number, "3a" in an arm);
 * map badges carry `data-stop-marker`. In the builder (`editBody`) every path
 * of a split shows, stacked (`builderRows`, `SplitBlock`), with the next-stop
 * row (`slot`) where the next add lands; the reader keeps the tabs.
 */
export function RouteStepTable({
  route,
  map,
  selected = null,
  open,
  onSummary,
  onChevron,
  onExpandAll,
  onCollapseAll,
  scrollTo = null,
  onOpenCard,
  openCampId = null,
  only,
  stopBody,
  choice,
  onChoose,
  editBody,
  stopTools,
  splitEdit,
  dnd,
  slot,
  slotRow,
}: {
  route: CreepRoute;
  map: CreepMap;
  /** The selected stop's key (`stop-numbers.mjs`: "0", "2.a.0"), or null. */
  selected?: string | null;
  /** Keys of the expanded stops. */
  open: Set<string>;
  onSummary: (key: string) => void;
  onChevron: (key: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  /** A stop to scroll into view; a new object each time it should scroll. */
  scrollTo?: { key: string } | null;
  /** Pins the camp card for a stop's camp, from its camp label button. */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  /** The camp the card is showing, for the camp button's `aria-expanded`. */
  openCampId?: string | null;
  /** Show only this stop and no header (a guide's one-stop example); XP still runs over the whole route. */
  only?: number;
  /** Replaces an open stop's body; with `only`, a guide's editable kill order. */
  stopBody?: React.ReactNode;
  /** Split key to the chosen way of each "or"/"xor" split; default way a. */
  choice?: Record<string, number>;
  /** Chooses a way of a split from its tab strip. */
  onChoose?: (forkKey: string, arm: number) => void;
  /** The builder (`RouteEditor`): the open stop's body, by key (the stop's editor). The header has no "Expand all". */
  editBody?: (key: string) => React.ReactNode;
  /** The builder: the open stop's move and remove buttons, by key, on its summary line. */
  stopTools?: (key: string) => React.ReactNode;
  /** The builder: the controls of split `index` (its caption, path headings, add rows and after row). */
  splitEdit?: (index: number) => SplitEdit | undefined;
  /** The builder: drag handles and drop zones (rows, captions, a path's heading and add row, the end of the list). */
  dnd?: Dnd;
  /** The builder: where the next-stop row sits, `{ index }` or `{ index, arm, j }`, and the number it shows. */
  slot?: { index: number; arm?: number; j?: number; label: string };
  /** The builder: the next-stop row's content (`NextStopRow`). */
  slotRow?: React.ReactNode;
}) {
  // The header counts the numbered stops a reader of the chosen paths sees (no split, no waypoint).
  const count = countStops(route.stops, choice ?? {});
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const items = useRef(new Map<string, HTMLLIElement>());
  useEffect(() => {
    if (scrollTo) items.current.get(scrollTo.key)?.scrollIntoView({ block: "nearest" });
  }, [scrollTo]);

  const derived = useMemo(() => deriveRoute(route, map, { choice }), [route, map, choice]);
  const numbers = useMemo(() => numberStops(route.stops, choice ?? {}), [route.stops, choice]);
  const keys = useMemo(() => stopKeys(route.stops) as string[], [route.stops]);
  // Bring lists the hero only on a route that sends units somewhere without him: one hero-off camp or
  // attack stop (a pin does not count).
  const showHero = useMemo(() => (flatStops(route.stops) as { stop: RouteStop }[]).some(({ stop }) => stop.hero === false && !isWaypoint(stop)), [route.stops]);
  const baseId = useId();
  // Every route is a flat list with the lane rail (`route-rows.mjs`); a guide's one stop has none.
  const lanes = only === undefined;
  const builder = Boolean(editBody);
  const rows = useMemo(() => (lanes && !builder ? (routeRows(route.stops, choice ?? {}) as LaneRow[]) : []), [lanes, builder, route.stops, choice]);
  const blocks = useMemo(() => (lanes && builder ? (builderRows(route.stops, choice ?? {}, slot ?? null) as BuilderRow[]) : []), [lanes, builder, route.stops, choice, slot]);
  const derivedByKey = (key: string) => {
    const { index, arm, j } = parseKey(key);
    const d = derived.stops[index];
    return arm === undefined ? d : d.split!.arms[arm].stops[j];
  };
  // An "and" path stop counts as open when its split heading is.
  const blockOf = new Map(rows.flatMap((r) => (r.type === "stop" && r.block !== undefined ? [[r.key, String(r.block)] as const] : [])));
  const allOpen = count > 0 && keys.every((k) => open.has(blockOf.get(k) ?? k));
  const itemRef = (key: string) => (el: HTMLLIElement | null) => {
    if (el) items.current.set(key, el);
    else items.current.delete(key);
  };

  const renderRow = (row: LaneRow) => {
            if (row.type === "split") {
              return (
                <SplitRow
                  key={row.key}
                  mode={row.mode}
                  arms={row.stop.split?.arms ?? []}
                  node={derived.stops[row.index].split}
                  main={row.lines[0]}
                  lanes={row.lanes}
                  stopKey={row.key}
                  baseId={baseId}
                  onChoose={(forkKey, arm) => onChoose?.(forkKey, arm)}
                  isOpen={open.has(row.key)}
                  onToggle={builder ? undefined : () => onChevron(row.key)}
                />
              );
            }
            if (row.type === "join") {
              return <JoinRow key={row.key} lanes={row.lanes} />;
            }
            // A reader's "and" path stop opens with its split heading (`group`) and shows no level of its own.
            const group = !builder && row.block !== undefined ? String(row.block) : undefined;
            return (
              <StopBlock
                key={row.key}
                stop={row.stop}
                d={derivedByKey(row.key)}
                number={row.label}
                stopKey={row.key}
                map={map}
                youStart={route.start ?? 0}
                isActive={row.key === selected}
                isOpen={open.has(group ?? row.key)}
                isHover={row.key === hoverKey}
                bodyId={`${baseId}-stop-${row.key}`}
                onSummary={onSummary}
                onChevron={onChevron}
                onHover={setHoverKey}
                itemRef={itemRef(row.key)}
                onOpenCard={onOpenCard}
                openCampId={openCampId}
                showHero={showHero}
                heroIcon={route.hero}
                rail={<StopRail lines={row.lines} lane={row.lane} stop={row.stop} />}
                lane={row.lane}
                dnd={dnd?.({ kind: "row", key: row.key })}
                sharedXp={row.block !== undefined}
                chevron={!group}
                stopBody={editBody && open.has(row.key) ? editBody(row.key) : undefined}
                tools={stopTools && open.has(row.key) ? stopTools(row.key) : undefined}
              />
            );
          };
  // The builder's rows: the stop rows above, and the next-stop row and the split's rows (`SplitBlock`).
  const renderBuilderRow = (row: BuilderRow) => {
    if (row.type === "stop") return renderRow(row);
    if (row.type === "slot") {
      return (
        <li key="slot" data-next-stop className="relative border-t border-line/40 py-2 pl-[60px] pr-4 first:border-t-0 sm:pr-5">
          <SlotRail lines={row.lines} lane={row.lane} />
          {slotRow}
        </li>
      );
    }
    if (row.type === "sep") return <PathSep key={row.key} mode={row.mode} lines={row.lines} />;
    const edit = splitEdit?.(row.index);
    if (!edit) return null;
    if (row.type === "split") {
      return (
        <SplitCaption
          key={row.key}
          stopKey={row.key}
          mode={row.mode}
          main={row.lines.find((l) => l.lane === "a")}
          lanes={row.lanes}
          edit={edit}
          dnd={dnd?.({ kind: "caption", index: row.index, arm: 0 })}
        />
      );
    }
    if (row.type === "head") {
      return (
        <PathHead
          key={row.key}
          mode={row.mode}
          arm={row.arm}
          here={row.here}
          count={row.count}
          waypoints={row.waypoints}
          lines={row.lines}
          lane={row.lane}
          edit={edit}
          dnd={dnd?.({ kind: "path", index: row.index, arm: row.arm })}
        />
      );
    }
    if (row.type === "add") {
      return (
        <PathAdd
          key={row.key}
          mode={row.mode}
          arm={row.arm}
          empty={!row.length}
          lines={row.lines}
          onAdd={() => edit.onAddStops(row.arm)}
          dnd={dnd?.({ kind: "path", index: row.index, arm: row.arm, at: row.length })}
        />
      );
    }
    if (row.type === "more") return edit.onAddPath ? <AddThirdPath key={row.key} lines={row.lines} onAdd={edit.onAddPath} /> : null;
    const node = derived.stops[row.index].split;
    return (
      <AfterSplit
        key={row.key}
        lanes={row.lanes}
        joins={row.joins}
        follows={row.follows}
        slotAfter={row.slotAfter}
        node={row.mode === "and" ? node : undefined}
        onContinue={edit.onContinue}
      />
    );
  };

  return (
    <div className="panel">
      {only === undefined ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/60 px-4 py-3 sm:flex-nowrap sm:px-5">
          <div>
            <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">
              Route{" "}
              <span className="font-sans text-sm font-normal normal-case tracking-normal text-muted">
                · {count} stops
              </span>
            </h2>
            <p className="mt-1 text-[0.8rem] text-muted">XP at the hero&apos;s level at that moment. A boxed set is kills in any order.</p>
          </div>
          {editBody ? null : (
            <button
              type="button"
              onClick={allOpen ? onCollapseAll : onExpandAll}
              className="inline-flex h-8 shrink-0 items-center rounded border border-gold/50 px-2.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold hover:bg-gold/10"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
      ) : null}

      {lanes && builder ? (
        <ol>
          {groupBlocks(blocks).map((item) => {
            if (item.type !== "group") return renderBuilderRow(item);
            return (
              <li key={`block-${item.key}`} className="relative">
                <ol>{item.rows.map(renderBuilderRow)}</ol>
              </li>
            );
          })}
          {/* The last drop zone: the end of the list. */}
          {dnd ? <li aria-hidden {...dnd({ kind: "end" }).props} className={cn("h-3", DROP)} /> : null}
        </ol>
      ) : lanes ? (
        <ol>
          {groupPanels(rows).map((group) => {
            // The chosen path of an "or"/"xor" split: one tab panel holding its rows.
            if (group.type === "panel") {
              const split = group.split;
              if (!group.rows.length) return null;
              return (
                <li key={`panel-${split.key}`} role="tabpanel" id={`${baseId}-panel-${split.key}`} aria-labelledby={`${baseId}-tab-${split.key}-${derived.stops[split.index].split?.walked ?? 0}`}>
                  <ol>{group.rows.map(renderRow)}</ol>
                </li>
              );
            }
            // An "and" block: its paths' rows in one item; the split row above carries their shared XP.
            if (group.type === "block") {
              return [
                renderRow(group.split),
                <li key={`block-${group.split.key}`} id={`${baseId}-block-${group.split.key}`} className="relative">
                  <ol>{group.rows.map(renderRow)}</ol>
                </li>,
              ];
            }
            const row = group as LaneRow;
            return renderRow(row);
          })}
        </ol>
      ) : (
      <ol>
        {route.stops.map((stop: RouteStop, i) => {
          if (only !== undefined && i !== only) return null;
          const d = derived.stops[i];
          const { key, label } = numbers[i];
          return (
            <StopBlock
              key={key}
              stop={stop}
              d={d}
              number={label}
              stopKey={key}
              map={map}
              youStart={route.start ?? 0}
              isActive={key === selected}
              isOpen={open.has(key)}
              isHover={key === hoverKey}
              bodyId={`${baseId}-stop-${key}`}
              onSummary={onSummary}
              onChevron={onChevron}
              onHover={setHoverKey}
              itemRef={itemRef(key)}
              onOpenCard={onOpenCard}
              openCampId={openCampId}
              stopBody={stopBody}
              showHero={showHero}
              heroIcon={route.hero}
            />
          );
        })}
      </ol>
      )}
    </div>
  );
}

/** Rows in order; each "or"/"xor" split row is followed by its tab panel, the chosen path's rows (maybe none);
 *  an "and" split row and its paths' rows become one block. */
type PanelGroup = { type: "panel" | "block"; split: LaneRow & { type: "split" }; rows: LaneRow[] };

function groupPanels(rows: LaneRow[]): (LaneRow | PanelGroup)[] {
  const out: (LaneRow | PanelGroup)[] = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    if (row.type === "stop" && (row.panel || row.block) && (last?.type === "panel" || last?.type === "block")) last.rows.push(row);
    else if (row.type === "split" && row.mode === "and") out.push({ type: "block", split: row, rows: [] });
    else out.push(row);
    if (row.type === "split" && row.mode !== "and") out.push({ type: "panel", split: row, rows: [] });
  }
  return out;
}

/** The builder's rows in order, a split's rows (`group`) gathered into one item. */
type BlockGroup = { type: "group"; key: string; rows: BuilderRow[] };

function groupBlocks(rows: BuilderRow[]): (BuilderRow | BlockGroup)[] {
  const out: (BuilderRow | BlockGroup)[] = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    if (row.group === undefined) out.push(row);
    else if (last?.type === "group" && last.key === row.group) last.rows.push(row);
    else out.push({ type: "group", key: row.group, rows: [row] });
  }
  return out;
}
