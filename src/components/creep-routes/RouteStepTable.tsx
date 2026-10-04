"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { deriveRoute } from "@/lib/creep-routes/derive";
import { countStops, flatStops, numberStops, parseKey, stopKeys } from "@/lib/creep-routes/stop-numbers.mjs";
import { joinXpLabel, routeRows } from "@/lib/creep-routes/route-rows.mjs";
import { isWaypoint } from "@/lib/creep-routes/place.mjs";
import type { CampCardTrigger, CreepMap, CreepRoute, MapCamp, RouteStop } from "@/lib/creep-routes/types";
import { StopBlock } from "./StopBlock";
import { cn } from "@/lib/utils";
import { DROP, JoinRow, LaneLines, SlotRail, SplitRow, StopRail, type RailLine, type SplitEdit } from "./LaneRail";
import type { DropZone } from "./stop-rows";

/** The builder's drop handlers on a row (`RouteEditor`); `data-drop` lights the drop line. */
export type DropProps = Pick<React.LiHTMLAttributes<HTMLLIElement>, "onDragOver" | "onDrop"> & { "data-drop"?: string };
/** The builder's drag and drop for one zone: the row's handle and its drop handlers. */
export type Dnd = (zone: DropZone) => { handle?: React.ReactNode; props: DropProps };

/** One row of the flat lane list, see `route-rows.mjs`. */
type LaneRow =
  | { type: "stop"; key: string; label: string; stop: RouteStop; lane: string; lines: RailLine[]; node?: number; panel?: string; block?: string }
  | { type: "split"; key: string; stop: RouteStop; index: number; mode: "and" | "or" | "xor"; lanes: { lane: string; off: boolean }[]; lines: RailLine[] }
  | { type: "join"; key: string; index: number; mode: "and" | "or" | "xor"; lanes: { lane: string; off: boolean }[] }
  | { type: "slot"; key: string; label: string; lane: string; lines: RailLine[]; panel?: string; block?: string };

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
 * map badges carry `data-stop-marker`.
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
  splitEdit,
  pathTools,
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
  /** The builder: the controls on split `index`'s caption row. */
  splitEdit?: (index: number) => SplitEdit | undefined;
  /** The builder: a row of path controls at the top of split `index`'s chosen path. */
  pathTools?: (index: number) => React.ReactNode;
  /** The builder: drag handles and drop zones (rows, captions, an empty path, the end of the list). */
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
  // attack stop (a waypoint done by another unit, a lone scout, does not count).
  const showHero = useMemo(() => (flatStops(route.stops) as { stop: RouteStop }[]).some(({ stop }) => stop.hero === false && !isWaypoint(stop)), [route.stops]);
  const baseId = useId();
  // Every route is a flat list with the lane rail (`route-rows.mjs`); a guide's one stop has none.
  const lanes = only === undefined;
  const rows = useMemo(() => (lanes ? (routeRows(route.stops, choice ?? {}, slot ?? null) as LaneRow[]) : []), [lanes, route.stops, choice, slot]);
  const derivedByKey = (key: string) => {
    const { index, arm, j } = parseKey(key);
    const d = derived.stops[index];
    return arm === undefined ? d : d.split!.arms[arm].stops[j];
  };
  const allOpen = count > 0 && keys.every((k) => open.has(k));
  const itemRef = (key: string) => (el: HTMLLIElement | null) => {
    if (el) items.current.set(key, el);
    else items.current.delete(key);
  };

  const renderRow = (row: LaneRow) => {
            if (row.type === "slot") {
              return (
                <li key="slot" data-next-stop className="relative border-t border-line/40 py-2 pl-[60px] pr-4 first:border-t-0 sm:pr-5">
                  <SlotRail lines={row.lines} lane={row.lane} />
                  {slotRow}
                </li>
              );
            }
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
                  edit={splitEdit?.(row.index)}
                  dnd={dnd?.({ kind: "caption", index: row.index, arm: choice?.[String(row.index)] ?? 0 })}
                />
              );
            }
            if (row.type === "join") {
              const node = derived.stops[row.index].split;
              return <JoinRow key={row.key} lanes={row.lanes} xp={row.mode === "and" && node ? joinXpLabel(node) : undefined} />;
            }
            // Inside an "and" block the order across paths is unknown: the stop shows the level at the split.
            const block = row.block !== undefined && row.node !== undefined ? derived.stops[row.node].split : undefined;
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
                isOpen={open.has(row.key)}
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
                dnd={dnd?.({ kind: "row", key: row.key })}
                entry={block ? { level: block.levelBefore, xp: block.xpBefore } : undefined}
                stopBody={editBody && open.has(row.key) ? editBody(row.key) : undefined}
              />
            );
          };
  // The builder's path controls under a split's caption row, with the split's lanes running past.
  const toolsRow = (split: LaneRow & { type: "split" }) => {
    const tools = pathTools?.(split.index);
    if (!tools) return null;
    return (
      <li
        key={`tools-${split.key}`}
        {...dnd?.({ kind: "path", index: split.index, arm: choice?.[String(split.index)] ?? 0 }).props}
        className={cn("relative py-2 pl-[60px] pr-4 sm:pr-5", DROP)}
      >
        <LaneLines lanes={split.lanes} />
        {tools}
      </li>
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

      {lanes ? (
        <ol>
          {groupPanels(rows).map((group) => {
            // The chosen path of an "or"/"xor" split: one tab panel holding its rows.
            if (group.type === "panel") {
              const split = group.split;
              const tools = toolsRow(split);
              if (!group.rows.length && !tools) return null;
              return (
                <li key={`panel-${split.key}`} role="tabpanel" id={`${baseId}-panel-${split.key}`} aria-labelledby={`${baseId}-tab-${split.key}-${derived.stops[split.index].split?.walked ?? 0}`}>
                  <ol>
                    {tools}
                    {group.rows.map(renderRow)}
                  </ol>
                </li>
              );
            }
            // An "and" block: its paths' rows in one item, framed in gold when the hero levels during it.
            if (group.type === "block") {
              const node = derived.stops[group.split.index].split;
              const leveled = Boolean(node && node.levelAfter > node.levelBefore);
              return [
                renderRow(group.split),
                toolsRow(group.split),
                <li key={`block-${group.split.key}`} className="relative">
                  <ol>{group.rows.map(renderRow)}</ol>
                  {leveled ? <span aria-hidden className="pointer-events-none absolute inset-0 rounded border-2 border-gold" /> : null}
                </li>,
              ];
            }
            const row = group as LaneRow;
            return renderRow(row);
          })}
          {/* The builder's last drop zone: the end of the list. */}
          {dnd ? <li aria-hidden {...dnd({ kind: "end" }).props} className={cn("h-3", DROP)} /> : null}
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
    if ((row.type === "stop" || row.type === "slot") && (row.panel || row.block) && (last?.type === "panel" || last?.type === "block")) last.rows.push(row);
    else if (row.type === "split" && row.mode === "and") out.push({ type: "block", split: row, rows: [] });
    else out.push(row);
    if (row.type === "split" && row.mode !== "and") out.push({ type: "panel", split: row, rows: [] });
  }
  return out;
}
