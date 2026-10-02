"use client";

import { ChevronDown, ChevronRight, Image as ImageIcon } from "lucide-react";
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
import { HeroTile } from "./HeroTile";
import { StopImages } from "./StopImages";
import { cn } from "@/lib/utils";

/** The chain's inputs for a stop: its kills and, with `leaveRest`, the skipped creeps. */
function skippedOf(stop: RouteStop, camp: MapCamp) {
  return stop.leaveRest && validKills(camp, stop.kills).length
    ? (unorderedCreeps(camp, stop.kills) as { creep: MapCampCreep; row: number }[])
    : [];
}

/** A stop's expanded body: the kill chain, Bring, condition, note and pictures. */
function StopBody({ stop, d, absent, hero }: { stop: RouteStop; d: DerivedStop; absent: boolean; hero?: React.ReactNode }) {
  const camp = d.camp;
  return (
    <div className="min-w-0 space-y-3">
      {camp ? <KillOrder camp={camp} kills={d.kills} skipped={skippedOf(stop, camp)} noXp={absent} /> : null}

      {stop.units?.length || hero ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.75rem] text-muted">Bring</span>
          {hero}
          {stop.units?.map((u, ui) => (
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

      {stop.images?.length ? <StopImages images={stop.images} /> : null}
    </div>
  );
}

/**
 * One stop of the route as a disclosure (`RouteStepTable`), with the lane rail
 * in front of it on a route with a node. The summary line is a button over the whole line that selects
 * and opens the stop (`onSummary`); the chevron only opens or closes it
 * (`onChevron`); the camp label is its own button that pins the camp card.
 * `number` is the stop's label from `stop-numbers.mjs` ("3", "3a").
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
  rail,
  dim = false,
  showHero = false,
  heroIcon,
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
  /** The lane rail cell (`StopRail`) on a route with a split. */
  rail?: React.ReactNode;
  /** A way not chosen in an "or" split: drawn at 45%. */
  dim?: boolean;
  /** The route uses the hero toggle somewhere: Bring lists the hero first wherever he goes. */
  showHero?: boolean;
  /** The route's hero, for that Bring entry; a generic "Any Hero" tile when unset. */
  heroIcon?: string;
}) {
  const camp = d.camp;
  const label = camp ? campLabel(camp) : stop.action || stop.campId || "-";
  const placeLabel = !camp && stop.place ? placeName(map, stop.place, youStart) : null;
  const where = placeLabel && !actionNamesPlace(stop.action, placeLabel) ? placeLabel : null;
  const pictures = stop.images?.length ?? 0;
  // Hero off: its own flag, or a later way of an "and" split, which the hero cannot walk.
  const absent = stop.hero === false || d.hero === false;
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
        // With the lane rail, the rail takes 44px in front of the row and the row itself is unchanged.
        rail
          ? `relative border-t border-line/40 pl-[60px] pr-4 ${waypoint ? "py-2" : "py-4"} transition-colors first:border-t-0 sm:pr-5`
          : `border-t border-line/40 px-4 ${waypoint ? "py-2" : "py-4"} transition-colors first:border-t-0 sm:px-5`,
        dim && "opacity-[.45]",
        (isActive || isHover) && "bg-gold/10",
      )}
    >
      {rail}
      {/* Summary line: the select button covers it; the camp button and chevron sit above. */}
      <div className="relative grid grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] gap-x-3">
        <button
          type="button"
          onClick={() => (waypoint ? onChevron(stopKey) : onSummary(stopKey))}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          aria-label={waypoint ? `${label}, ${waypoint}` : camp && absent ? `Stop ${number}, ${label}` : camp ? `Stop ${number}, ${label}, hero Lv ${d.heroLevelAfter}, ${d.xpAfter} xp` : `Stop ${number}, ${label}${where ? `, ${where}` : ""}`}
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
          <div
            className={cn(
              "flex gap-3",
              isOpen ? "flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4" : "items-start justify-between",
              // Beside the lane rail on a phone the level line moves under the name instead of squeezing it.
              rail && "flex-wrap",
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
              <span className={cn("tnum shrink-0 pt-0.5 text-[0.8rem] text-muted", pictures && "ml-auto")}>
                Lv {d.heroLevelAfter} · {d.xpAfter} xp
              </span>
            ) : null}
            {pictures && !isOpen ? (
              <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[0.8rem] text-muted" aria-label={`${pictures} pictures`}>
                <ImageIcon aria-hidden size={14} />
                {pictures}
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
          {stopBody ?? (
            <StopBody
              stop={stop}
              d={d}
              absent={absent}
              hero={showHero && !absent && (camp || stop.place?.kind === "attack") ? <HeroTile heroIcon={heroIcon} /> : undefined}
            />
          )}
          <span />
        </div>
      ) : null}
    </li>
  );
}
