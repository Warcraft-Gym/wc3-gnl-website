"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { deriveRoute, type DerivedStop } from "@/lib/creep-routes/derive";
import { killedXpShare, unorderedCreeps, validKills } from "@/lib/creep-routes/kills.mjs";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import type { CampCardTrigger, CreepMap, CreepRoute, RouteStop, MapCamp, MapCampCreep } from "@/lib/creep-routes/types";
import { GameIcon } from "@/components/builds/GameIcon";
import { BAND_LABEL, BandDot } from "./RouteBadges";
import { HeroMeter } from "./HeroMeter";
import { KillOrder, KillStrip } from "./KillOrder";
import { cn } from "@/lib/utils";

/** The chain's inputs for a stop: its kills and, with `leaveRest`, the skipped creeps. */
function skippedOf(stop: RouteStop, camp: MapCamp) {
  return stop.leaveRest && validKills(camp, stop.kills).length
    ? (unorderedCreeps(camp, stop.kills) as { creep: MapCampCreep; row: number }[])
    : [];
}

/** A stop's expanded body: the kill chain, Bring, condition and note. */
function StopBody({ stop, d }: { stop: RouteStop; d: DerivedStop }) {
  const camp = d.camp;
  return (
    <div className="min-w-0 space-y-3">
      {camp ? <KillOrder camp={camp} kills={d.kills} skipped={skippedOf(stop, camp)} /> : null}

      {stop.units?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.75rem] text-muted">Bring</span>
          {stop.units.map((u, ui) => (
            <span key={ui} className="inline-flex items-center gap-1">
              <GameIcon iconKey={u.icon} size={28} />
              {u.count > 1 ? <span className="tnum text-[0.75rem] text-muted">×{u.count}</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      {stop.condition ? (
        <span
          title="Condition"
          className="inline-flex w-fit max-w-full items-center whitespace-normal rounded border border-arcane/40 bg-arcane/10 px-1.5 py-0.5 text-[0.75rem] leading-snug text-arcane"
        >
          {stop.condition}
        </span>
      ) : null}

      {stop.note ? <p className="max-w-[60ch] text-sm leading-relaxed text-muted">{stop.note}</p> : null}
    </div>
  );
}

/**
 * The route as an ordered list of stops, each a disclosure. Both states are
 * owned by the page (`stop-view.mjs`): `selected` (the gold dot, the map's
 * pulsing node) and `open` (expanded stops). The summary line is a button
 * over the whole line that selects and opens its stop (`onSummary`); the
 * chevron at its right edge only opens or closes it (`onChevron`); the camp
 * label inside it is its own button that pins the camp card. `scrollTo`
 * scrolls a stop into view (a selection from the map). Blocks carry
 * `data-stop`; map badges carry `data-stop-marker`.
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
}: {
  route: CreepRoute;
  map: CreepMap;
  /** The selected stop index, or null. */
  selected?: number | null;
  /** Indexes of the expanded stops. */
  open: Set<number>;
  onSummary: (index: number) => void;
  onChevron: (index: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  /** A stop to scroll into view; a new object each time it should scroll. */
  scrollTo?: { index: number } | null;
  /** Pins the camp card for a stop's camp, from its camp label button. */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  /** The camp the card is showing, for the camp button's `aria-expanded`. */
  openCampId?: string | null;
  /** Show only this stop and no header (a guide's one-stop example); XP still runs over the whole route. */
  only?: number;
  /** Replaces an open stop's body; with `only`, a guide's editable kill order. */
  stopBody?: React.ReactNode;
}) {
  const count = route.stops.length;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    if (scrollTo) items.current[scrollTo.index]?.scrollIntoView({ block: "nearest" });
  }, [scrollTo]);

  const derived = useMemo(() => deriveRoute(route, map), [route, map]);
  const baseId = useId();
  const allOpen = count > 0 && open.size === count;

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
        {route.stops.map((stop, i) => {
          if (only !== undefined && i !== only) return null;
          const d = derived.stops[i];
          const camp = d.camp;
          const isActive = i === selected;
          const isOpen = open.has(i);
          const bodyId = `${baseId}-stop-${i}`;
          const label = camp ? campLabel(camp) : stop.action || stop.campId || "-";
          return (
            <li
              key={i}
              ref={(el) => {
                items.current[i] = el;
              }}
              data-stop={i + 1}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "border-t border-line/40 px-4 py-4 transition-colors first:border-t-0 sm:px-5",
                (isActive || i === hoverIndex) && "bg-gold/10",
              )}
            >
              {/* Summary line: the select button covers it; the camp button and chevron sit above. */}
              <div className="relative grid grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] gap-x-3">
                <button
                  type="button"
                  onClick={() => onSummary(i)}
                  aria-expanded={isOpen}
                  aria-controls={bodyId}
                  aria-label={camp ? `Stop ${i + 1}, ${label}, hero Lv ${d.heroLevelAfter}, ${d.xpAfter} xp` : `Stop ${i + 1}, ${label}`}
                  className="absolute inset-0 cursor-pointer rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                />
                <span className="tnum pointer-events-none relative pt-1 text-center text-xs text-faint">
                  {isActive ? (
                    <span aria-hidden className="inline-block size-2 rounded-full bg-gold shadow-[0_0_10px_var(--wg-gold-glow)]" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="pointer-events-none relative min-w-0">
                  <div
                    className={cn(
                      "flex gap-3",
                      isOpen ? "flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4" : "items-start justify-between",
                    )}
                  >
                    {camp ? (
                      <button
                        type="button"
                        onClick={(e) => onOpenCard?.(camp, e.currentTarget)}
                        aria-haspopup="dialog"
                        aria-expanded={camp.id === openCampId}
                        className="pointer-events-auto min-w-0 rounded pt-0.5 text-left text-sm hover:[&_.camp-name]:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold sm:flex sm:flex-wrap sm:items-center sm:gap-x-2"
                      >
                        <span className="inline-flex items-start gap-1.5">
                          <BandDot className="mt-1.5" band={d.band} killed={d.left > 0 ? killedXpShare(camp, stop.kills, stop.leaveRest) : undefined} />
                          <span className="camp-name font-medium text-fg">{label}</span>
                        </span>
                        <span className={cn("items-center gap-1.5 pl-3.5 text-muted sm:flex sm:pl-0", isOpen ? "flex" : "hidden")}>
                          <span>
                            {BAND_LABEL[camp.band] ?? camp.band} · Lv {camp.level}
                          </span>
                          <ChevronRight aria-hidden size={14} className="shrink-0 text-faint" />
                        </span>
                      </button>
                    ) : (
                      <p className="pt-0.5 text-sm font-medium text-fg">{label}</p>
                    )}
                    {camp && isOpen ? <HeroMeter level={d.heroLevelAfter} xp={d.xpAfter} /> : null}
                    {camp && !isOpen ? (
                      <span className="tnum shrink-0 pt-0.5 text-[0.8rem] text-muted">
                        Lv {d.heroLevelAfter} · {d.xpAfter} xp
                      </span>
                    ) : null}
                  </div>
                  {camp && !isOpen ? (
                    <div className="mt-2">
                      <KillStrip kills={d.kills} skipped={skippedOf(stop, camp)} />
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onChevron(i)}
                  aria-expanded={isOpen}
                  aria-controls={bodyId}
                  aria-label={`${isOpen ? "Hide" : "Show"} stop ${i + 1} details`}
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
                  {stopBody ?? <StopBody stop={stop} d={d} />}
                  <span />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
