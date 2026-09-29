"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { deriveRoute, type DerivedStop } from "@/lib/creep-routes/derive";
import { killedXpShare, unorderedCreeps, validKills } from "@/lib/creep-routes/kills.mjs";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import type { CampCardTrigger, CreepMap, CreepRoute, RouteStop, MapCamp, MapCampCreep } from "@/lib/creep-routes/types";
import { GameIcon } from "@/components/builds/GameIcon";
import { BAND_LABEL, BandDot } from "./RouteBadges";
import { HeroMeter } from "./HeroMeter";
import { KillOrder, KillStrip } from "./KillOrder";
import { cn } from "@/lib/utils";

/** The chain's inputs for a stop: its kills and, with `leaveRest`, the creeps left alive. */
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
 * The route as an ordered list of stops, each a disclosure. The summary line
 * is a button over the whole line: it toggles the stop open and toggles the
 * shared selection (`onActiveChange`, lifted to the page so the map agrees).
 * The camp label inside it is its own button that pins the camp card. Every
 * stop starts open on a route of 5 stops or fewer, closed beyond that; a
 * stop selected from the map opens and scrolls into view. Blocks carry
 * `data-stop`; map badges carry `data-stop-marker`.
 */
export function RouteStepTable({
  route,
  map,
  active = null,
  onActiveChange,
  onOpenCard,
  openCampId = null,
}: {
  route: CreepRoute;
  map: CreepMap;
  /** Controlled: the selected stop index, or null. */
  active?: number | null;
  onActiveChange?: (index: number | null) => void;
  /** Pins the camp card for a stop's camp, from its camp label button. */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  /** The camp the card is showing, for the camp button's `aria-expanded`. */
  openCampId?: string | null;
}) {
  const count = route.stops.length;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [open, setOpen] = useState<Set<number>>(() => new Set(count <= 5 ? route.stops.map((_, i) => i) : []));
  // The selection this list set itself; any other change of `active` came from the map.
  const [ownActive, setOwnActive] = useState<number | null>(active);
  const [seenActive, setSeenActive] = useState<number | null>(active);
  if (active !== seenActive) {
    setSeenActive(active);
    if (active !== null && active !== ownActive && !open.has(active)) setOpen(new Set(open).add(active));
  }
  const items = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => {
    if (active !== null && active !== ownActive) items.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active, ownActive]);

  const derived = useMemo(() => deriveRoute(route, map), [route, map]);
  const baseId = useId();
  const allOpen = open.size === count;

  return (
    <div className="panel">
      <div className="flex items-start justify-between gap-3 border-b border-line/60 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">
            Route{" "}
            <span className="font-sans text-sm font-normal normal-case tracking-normal text-muted">
              · {count} stops
            </span>
          </h2>
          <p className="mt-1 text-[0.8rem] text-muted">XP per kill at the hero&apos;s level at that moment.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(new Set(allOpen ? [] : route.stops.map((_, i) => i)))}
          className="h-7 shrink-0 px-1 text-xs text-muted hover:text-gold"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <ol>
        {route.stops.map((stop, i) => {
          const d = derived.stops[i];
          const camp = d.camp;
          const isActive = i === active;
          const isOpen = open.has(i);
          const bodyId = `${baseId}-stop-${i}`;
          const label = camp ? campLabel(camp) : stop.action || stop.campId || "-";
          const toggle = () => {
            const next = new Set(open);
            if (isOpen) next.delete(i);
            else next.add(i);
            setOpen(next);
            const nextActive = active === i ? null : i;
            setOwnActive(nextActive);
            onActiveChange?.(nextActive);
          };
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
              {/* Summary line: the disclosure button covers it; only the camp button sits above. */}
              <div className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
                <button
                  type="button"
                  onClick={toggle}
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
              </div>
              {isOpen ? (
                <div id={bodyId} className="mt-3 grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
                  <span />
                  <StopBody stop={stop} d={d} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
