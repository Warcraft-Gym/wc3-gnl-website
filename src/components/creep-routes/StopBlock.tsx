"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { DerivedStop } from "@/lib/creep-routes/derive";
import { killedXpShare, unorderedCreeps, validKills } from "@/lib/creep-routes/kills.mjs";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import { actionNamesPlace, isWaypoint, placeName } from "@/lib/creep-routes/place.mjs";
import type { CampCardTrigger, CreepMap, RouteStop, MapCamp, MapCampCreep } from "@/lib/creep-routes/types";
import { GameIcon } from "@/components/builds/GameIcon";
import { BAND_LABEL, BandDot } from "./RouteBadges";
import { HeroMeter } from "./HeroMeter";
import { KillOrder, KillStrip } from "./KillOrder";
import { PlaceIcon } from "./PlaceGlyph";
import { cn } from "@/lib/utils";

/** The chain's inputs for a stop: its kills and, with `leaveRest`, the skipped creeps. */
function skippedOf(stop: RouteStop, camp: MapCamp) {
  return stop.leaveRest && validKills(camp, stop.kills).length
    ? (unorderedCreeps(camp, stop.kills) as { creep: MapCampCreep; row: number }[])
    : [];
}

/** A stop's expanded body: the kill chain, Bring, condition and note. */
function StopBody({ stop, d, absent }: { stop: RouteStop; d: DerivedStop; absent: boolean }) {
  const camp = d.camp;
  return (
    <div className="min-w-0 space-y-3">
      {camp ? <KillOrder camp={camp} kills={d.kills} skipped={skippedOf(stop, camp)} noXp={absent} /> : null}

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
 * One stop of the route as a disclosure (`RouteStepTable`, and nested inside a
 * fork's arm). The summary line is a button over the whole line that selects
 * and opens the stop (`onSummary`); the chevron only opens or closes it
 * (`onChevron`); the camp label is its own button that pins the camp card.
 * `number` is the stop's label from `stop-numbers.mjs` ("3", "3a"). A fork
 * (`ForkBlock`) passes its own `title`, `summaryLabel` and body (`children`).
 */
export function StopBlock({
  stop,
  d,
  number,
  stopKey,
  map,
  youStart,
  isActive,
  isOpen,
  isHover,
  bodyId,
  onSummary,
  onChevron,
  onHover,
  itemRef,
  onOpenCard,
  openCampId,
  stopBody,
  nested = false,
  title,
  summaryLabel,
  children,
}: {
  stop: RouteStop;
  d: DerivedStop;
  number: string;
  stopKey: string;
  map: CreepMap;
  youStart: number;
  isActive: boolean;
  isOpen: boolean;
  isHover: boolean;
  bodyId: string;
  onSummary: (key: string) => void;
  onChevron: (key: string) => void;
  onHover: (key: string | null) => void;
  itemRef: (el: HTMLLIElement | null) => void;
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
  openCampId: string | null;
  stopBody?: React.ReactNode;
  /** Inside a fork's arm: a tighter left inset. */
  nested?: boolean;
  /** Replaces the summary line's content (a fork's name and way chips). */
  title?: React.ReactNode;
  /** Replaces the summary button's label. */
  summaryLabel?: string;
  /** Replaces the open body (a fork's ways). */
  children?: React.ReactNode;
}) {
  const camp = d.camp;
  const label = camp ? campLabel(camp) : stop.action || stop.campId || "-";
  const placeLabel = !camp && stop.place ? placeName(map, stop.place, youStart) : null;
  const where = placeLabel && !actionNamesPlace(stop.action, placeLabel) ? placeLabel : null;
  // An arm of a "both" fork past the first runs without the hero whatever its own flag says.
  const absent = Boolean(stop.heroAbsent || d.heroAbsent);
  // A waypoint is a slim row with no number; its summary only opens and closes it (the map never selects it).
  const waypoint = isWaypoint(stop) && stop.place ? stop.place.kind : null;
  return (
    <li
      ref={itemRef}
      data-stop={number || undefined}
      data-waypoint={waypoint ?? undefined}
      onMouseEnter={() => onHover(stopKey)}
      onMouseLeave={() => onHover(null)}
      aria-current={isActive ? "step" : undefined}
      className={cn(
        nested
          ? `border-t border-line/40 ${waypoint ? "py-2" : "py-3"} pl-3 transition-colors first:border-t-0`
          : `border-t border-line/40 px-4 ${waypoint ? "py-2" : "py-4"} transition-colors first:border-t-0 sm:px-5`,
        (isActive || isHover) && "bg-gold/10",
      )}
    >
      {/* Summary line: the select button covers it; the camp button and chevron sit above. */}
      <div className="relative grid grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] gap-x-3">
        <button
          type="button"
          onClick={() => (waypoint ? onChevron(stopKey) : onSummary(stopKey))}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          aria-label={summaryLabel ?? (waypoint ? `${label}, ${waypoint}` : camp && absent ? `Stop ${number}, ${label}, without the hero` : camp ? `Stop ${number}, ${label}, hero Lv ${d.heroLevelAfter}, ${d.xpAfter} xp` : `Stop ${number}, ${label}${where ? `, ${where}` : ""}`)}
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
          {title ?? (
            <>
              <div
                className={cn(
                  "flex gap-3",
                  isOpen ? "flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4" : "items-start justify-between",
                  // In a fork's narrower way the level line moves under the name instead of squeezing it.
                  nested && "flex-wrap",
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
                        {absent ? " · without the hero" : null}
                      </span>
                      <ChevronRight aria-hidden size={14} className="shrink-0 text-faint" />
                    </span>
                  </button>
                ) : stop.place ? (
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 pt-0.5 text-sm">
                    <PlaceIcon kind={stop.place.kind} className={cn("shrink-0 self-center", waypoint ? "text-fg" : "text-loss")} />
                    <span className="font-medium text-fg">{label}</span>
                    {waypoint ? <span className="text-muted">{waypoint}</span> : where ? <span className="text-muted">{where}</span> : null}
                  </p>
                ) : (
                  <p className="pt-0.5 text-sm font-medium text-fg">{label}</p>
                )}
                {camp && isOpen && !absent ? <HeroMeter level={d.heroLevelAfter} xp={d.xpAfter} /> : null}
                {camp && !isOpen && !absent ? (
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
            </>
          )}
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
          {children ?? stopBody ?? <StopBody stop={stop} d={d} absent={absent} />}
          <span />
        </div>
      ) : null}
    </li>
  );
}
