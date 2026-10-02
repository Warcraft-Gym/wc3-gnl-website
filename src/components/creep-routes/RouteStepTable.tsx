"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { deriveRoute } from "@/lib/creep-routes/derive";
import { countStops, numberStops, stopKeys } from "@/lib/creep-routes/stop-numbers.mjs";
import type { CampCardTrigger, CreepMap, CreepRoute, MapCamp, RouteStop } from "@/lib/creep-routes/types";
import { StopBlock } from "./StopBlock";
import { ForkBlock } from "./ForkBlock";

/**
 * The route as an ordered list of stops, each a disclosure. Both states are
 * owned by the page (`stop-view.mjs`): `selected` (the gold dot, the map's
 * pulsing node) and `open` (expanded stops). The summary line is a button
 * over the whole line that selects and opens its stop (`onSummary`); the
 * chevron at its right edge only opens or closes it (`onChevron`); the camp
 * label inside it is its own button that pins the camp card. `scrollTo`
 * scrolls a stop into view (a selection from the map). Stops are named by
 * the keys of `stop-numbers.mjs`; a fork node is a `ForkBlock` that nests its
 * arms' stops. Blocks carry `data-stop` (the stop's number, "3a" in an arm);
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
  /** Fork key to the chosen arm of each "either" fork; default arm 0. */
  choice?: Record<string, number>;
  /** Chooses an arm of an "either" fork from its open block. */
  onChoose?: (forkKey: string, arm: number) => void;
}) {
  // The header counts every arm's stops; a fork node is not a stop of its own.
  const count = countStops(route.stops);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const items = useRef(new Map<string, HTMLLIElement>());
  useEffect(() => {
    if (scrollTo) items.current.get(scrollTo.key)?.scrollIntoView({ block: "nearest" });
  }, [scrollTo]);

  const derived = useMemo(() => deriveRoute(route, map, { choice }), [route, map, choice]);
  const numbers = useMemo(() => numberStops(route.stops), [route.stops]);
  const keys = useMemo(() => stopKeys(route.stops) as string[], [route.stops]);
  const baseId = useId();
  const allOpen = count > 0 && keys.every((k) => open.has(k));
  const itemRef = (key: string) => (el: HTMLLIElement | null) => {
    if (el) items.current.set(key, el);
    else items.current.delete(key);
  };

  return (
    <div className="panel">
      {only === undefined ? (
        <div className="flex items-start justify-between gap-3 border-b border-line/60 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">
              Route{" "}
              <span className="font-sans text-sm font-normal normal-case tracking-normal text-muted">
                · {count} stops
              </span>
            </h2>
            <p className="mt-1 text-[0.8rem] text-muted">XP at the hero&apos;s level at that moment. A boxed set is kills in any order.</p>
          </div>
          <button
            type="button"
            onClick={allOpen ? onCollapseAll : onExpandAll}
            className="inline-flex h-8 shrink-0 items-center rounded border border-gold/50 px-2.5 text-[0.65rem] font-bold uppercase tracking-wide text-gold hover:bg-gold/10"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>
      ) : null}

      <ol>
        {route.stops.map((stop: RouteStop, i) => {
          if (only !== undefined && i !== only) return null;
          const d = derived.stops[i];
          const { key, label, arms } = numbers[i];
          if (stop.fork && d.fork && arms) {
            return (
              <ForkBlock
                key={key}
                stop={{ ...stop, fork: stop.fork }}
                d={{ ...d, fork: d.fork }}
                number={label}
                armNumbers={arms}
                stopKey={key}
                map={map}
                youStart={route.start ?? 0}
                selected={selected}
                open={open}
                hover={hoverKey}
                baseId={baseId}
                onSummary={onSummary}
                onChevron={onChevron}
                onHover={setHoverKey}
                itemRef={itemRef}
                onChoose={(forkKey, arm) => onChoose?.(forkKey, arm)}
                onOpenCard={onOpenCard}
                openCampId={openCampId}
              />
            );
          }
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
            />
          );
        })}
      </ol>
    </div>
  );
}
