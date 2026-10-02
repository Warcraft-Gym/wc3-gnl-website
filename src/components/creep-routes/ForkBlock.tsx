"use client";

import { ChevronDown } from "lucide-react";
import type { DerivedStop } from "@/lib/creep-routes/derive";
import type { CampCardTrigger, CreepMap, MapCamp, RouteStop } from "@/lib/creep-routes/types";
import { StopBlock } from "./StopBlock";
import { cn } from "@/lib/utils";

/**
 * A fork node in the stop list: one stop block whose summary reads "Choose a
 * way" (either) or "At the same time" (both), its arm labels as chips when
 * collapsed. Open, an "either" fork shows one button per arm (the condition
 * chip's arcane styling, the hero's level at that arm's end) and the chosen
 * arm's stops nested below; a "both" fork lists every arm in turn, arms 1..
 * without the hero. Nested stops are the same `StopBlock`.
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
}: {
  stop: RouteStop & { fork: NonNullable<RouteStop["fork"]> };
  d: DerivedStop & { fork: NonNullable<DerivedStop["fork"]> };
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
}) {
  const { mode, arms } = stop.fork;
  const either = mode === "either";
  const name = either ? "Choose a way" : "At the same time";
  const isActive = selected === stopKey;
  const isOpen = open.has(stopKey);
  const bodyId = `${baseId}-stop-${stopKey}`;
  const walked = d.fork.walked;

  const armList = (a: number) => (
    <ol className="border-l-2 border-arcane/40">
      {arms[a].stops.map((s, j) => {
        const { key, label } = armNumbers[a].stops[j];
        return (
          <StopBlock
            key={key}
            nested
            stop={s}
            d={d.fork.arms[a].stops[j]}
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
          />
        );
      })}
    </ol>
  );

  return (
    <li
      ref={itemRef(stopKey)}
      data-stop={number}
      onMouseEnter={() => onHover(stopKey)}
      onMouseLeave={() => onHover(null)}
      aria-current={isActive ? "step" : undefined}
      className={cn(
        "border-t border-line/40 px-4 py-4 transition-colors first:border-t-0 sm:px-5",
        (isActive || hover === stopKey) && "bg-gold/10",
      )}
    >
      <div className="relative grid grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] gap-x-3">
        <button
          type="button"
          onClick={() => onSummary(stopKey)}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          aria-label={`Stop ${number}, ${name}`}
          className="absolute inset-0 cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
        />
        <span className="tnum pointer-events-none relative pt-1 text-center text-xs text-faint">
          {isActive ? (
            <span aria-hidden className="inline-block size-2 rounded-full bg-gold shadow-[0_0_10px_var(--wg-gold-glow)]" />
          ) : (
            number
          )}
        </span>
        <div className="pointer-events-none relative min-w-0">
          <p className="pt-0.5 text-sm font-medium text-fg">{name}</p>
          {!isOpen && arms.some((arm) => arm.label) ? (
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
        </div>
        <button
          type="button"
          onClick={() => onChevron(stopKey)}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          aria-label={`${isOpen ? "Hide" : "Show"} stop ${number} details`}
          className={cn(
            "relative grid size-5 place-items-center self-start rounded hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
            isOpen ? "text-gold" : "text-faint",
          )}
        >
          <ChevronDown aria-hidden size={16} className={cn("transition-transform motion-reduce:transition-none", isOpen && "rotate-180")} />
        </button>
      </div>
      {isOpen ? (
        <div id={bodyId} className="mt-3 grid grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] gap-x-3">
          <span />
          <div className="min-w-0 space-y-3">
            {either ? (
              <>
                <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1.5">
                  {arms.map((arm, a) => {
                    const chosen = a === walked;
                    const end = d.fork.arms[a];
                    return (
                      <button
                        key={a}
                        type="button"
                        role="radio"
                        aria-checked={chosen}
                        onClick={() => onChoose(stopKey, a)}
                        className={cn(
                          "inline-flex max-w-full items-baseline gap-1.5 rounded border border-arcane/40 px-1.5 py-0.5 text-left text-[0.75rem] leading-snug",
                          chosen ? "bg-arcane/10 text-fg" : "text-arcane hover:bg-arcane/5",
                        )}
                      >
                        <span>{arm.label}</span>
                        <span className="tnum shrink-0 text-muted">
                          Lv {end.levelAfter} · {end.xpAfter} xp
                        </span>
                      </button>
                    );
                  })}
                </div>
                {armList(walked)}
              </>
            ) : (
              arms.map((arm, a) => (
                <div key={a} className="space-y-1.5">
                  {arm.label ? <p className="text-[0.75rem] text-muted">{arm.label}</p> : null}
                  {armList(a)}
                </div>
              ))
            )}
          </div>
          <span />
        </div>
      ) : null}
    </li>
  );
}
