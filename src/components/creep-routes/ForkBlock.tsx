"use client";

import { useRef } from "react";
import type { DerivedStop } from "@/lib/creep-routes/derive";
import type { CampCardTrigger, CreepMap, MapCamp, RouteStop } from "@/lib/creep-routes/types";
import { StopBlock } from "./StopBlock";
import { cn } from "@/lib/utils";

/**
 * A node in the stop list, drawn through `StopBlock`'s title and body slots.
 * A fork reads "Choose a way": its body is a tab strip, one tab per arm (the
 * arm's label, the hero's level at its end muted after it), and the selected
 * arm's stops nested below; the map follows the tab. A parallel node reads
 * "At the same time": its arms sit side by side from `sm` up (stacked on a
 * phone), every arm with the same numbers, no labels. Nested stops are the
 * same `StopBlock`.
 */
export function ForkBlock({
  stop,
  d,
  number,
  armNumbers,
  stopKey,
  map,
  youStart,
  selected,
  open,
  hover,
  baseId,
  onSummary,
  onChevron,
  onHover,
  itemRef,
  onChoose,
  onOpenCard,
  openCampId,
  showHero,
  heroIcon,
}: {
  stop: RouteStop;
  d: DerivedStop;
  number: string;
  /** Each arm's stops as `{ key, label }`, from `numberStops`. */
  armNumbers: { stops: { key: string; label: string }[] }[];
  stopKey: string;
  map: CreepMap;
  youStart: number;
  selected: string | null;
  open: Set<string>;
  hover: string | null;
  baseId: string;
  onSummary: (key: string) => void;
  onChevron: (key: string) => void;
  onHover: (key: string | null) => void;
  itemRef: (key: string) => (el: HTMLLIElement | null) => void;
  onChoose: (forkKey: string, arm: number) => void;
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  openCampId: string | null;
  /** Bring's hero entry, passed to the nested stops (`StopBlock`). */
  showHero?: boolean;
  heroIcon?: string;
}) {
  const fork = Boolean(stop.fork);
  const arms: { label?: string; stops: RouteStop[] }[] = stop.fork?.arms ?? stop.parallel?.arms ?? [];
  const node = d.fork ?? d.parallel;
  const name = fork ? "Choose a way" : "At the same time";
  const walked = node?.walked ?? 0;
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabId = (a: number) => `${baseId}-tab-${stopKey}-${a}`;
  const panelId = `${baseId}-panel-${stopKey}`;

  // Arrow keys move the selection along the tab strip (`role="tablist"`), Home and End to its ends.
  const onTabKey = (e: React.KeyboardEvent, a: number) => {
    const last = arms.length - 1;
    const next = e.key === "ArrowRight" ? (a === last ? 0 : a + 1) : e.key === "ArrowLeft" ? (a === 0 ? last : a - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    onChoose(stopKey, next);
    tabs.current[next]?.focus();
  };

  const armList = (a: number) => (
    <ol className="border-l-2 border-arcane/40">
      {arms[a].stops.map((s, j) => {
        const { key, label } = armNumbers[a].stops[j];
        return (
          <StopBlock
            key={key}
            nested
            stop={s}
            d={node!.arms[a].stops[j]}
            number={label}
            stopKey={key}
            map={map}
            youStart={youStart}
            isActive={selected === key}
            isOpen={open.has(key)}
            isHover={hover === key}
            bodyId={`${baseId}-stop-${key}`}
            onSummary={onSummary}
            onChevron={onChevron}
            onHover={onHover}
            itemRef={itemRef(key)}
            onOpenCard={onOpenCard}
            openCampId={openCampId}
            showHero={showHero}
            heroIcon={heroIcon}
          />
        );
      })}
    </ol>
  );

  return (
    <StopBlock
      stop={stop}
      d={d}
      number={number}
      stopKey={stopKey}
      map={map}
      youStart={youStart}
      isActive={selected === stopKey}
      isOpen={open.has(stopKey)}
      isHover={hover === stopKey}
      bodyId={`${baseId}-stop-${stopKey}`}
      onSummary={onSummary}
      onChevron={onChevron}
      onHover={onHover}
      itemRef={itemRef(stopKey)}
      openCampId={openCampId}
      summaryLabel={`Stop ${number}, ${name}`}
      title={
        <>
          <p className="pt-0.5 text-sm font-medium text-fg">{name}</p>
          {!open.has(stopKey) && arms.some((arm) => arm.label) ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {arms.map((arm, a) =>
                arm.label ? (
                  <span key={a} className="rounded border border-line/60 px-1.5 py-0.5 text-[0.7rem] leading-snug text-muted">
                    {arm.label}
                  </span>
                ) : null,
              )}
            </div>
          ) : null}
        </>
      }
    >
      {fork ? (
        <div className="min-w-0 space-y-3">
          <div role="tablist" aria-label={name} className="flex flex-wrap gap-x-1 border-b border-line/60">
            {arms.map((arm, a) => {
              const chosen = a === walked;
              return (
                <button
                  key={a}
                  ref={(el) => {
                    tabs.current[a] = el;
                  }}
                  id={tabId(a)}
                  type="button"
                  role="tab"
                  aria-selected={chosen}
                  aria-controls={panelId}
                  tabIndex={chosen ? 0 : -1}
                  onClick={() => onChoose(stopKey, a)}
                  onKeyDown={(e) => onTabKey(e, a)}
                  className={cn(
                    "relative inline-flex max-w-full items-baseline gap-1.5 px-2 pb-2 pt-1 text-left text-[0.8rem] font-bold transition-colors",
                    "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-gold after:opacity-0",
                    "rounded-t focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                    chosen ? "text-fg after:opacity-100" : "text-muted hover:text-fg",
                  )}
                >
                  <span>{arm.label}</span>
                  <span className="tnum shrink-0 font-normal text-muted">Lv {node!.arms[a].levelAfter}</span>
                </button>
              );
            })}
          </div>
          <div role="tabpanel" id={panelId} aria-labelledby={tabId(walked)}>
            {armList(walked)}
          </div>
        </div>
      ) : (
        // Every arm runs at once and carries the same numbers; Bring on each stop says who goes.
        <div className="grid min-w-0 gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
          {arms.map((_, a) => (
            <div key={a} className="min-w-0">
              {armList(a)}
            </div>
          ))}
        </div>
      )}
    </StopBlock>
  );
}
