"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { deriveRoute, type DerivedStop } from "@/lib/creep-routes/derive";
import { hasKillOrder, killedXpShare, unorderedCreeps } from "@/lib/creep-routes/kills.mjs";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import type { CampCardTrigger, CreepMap, CreepRoute, RouteStop, MapCamp, MapCampCreep } from "@/lib/creep-routes/types";
import { GameIcon } from "@/components/builds/GameIcon";
import { BAND_LABEL, BandDot } from "./RouteBadges";
import { HeroMeter } from "./HeroMeter";
import { KillOrder } from "./KillOrder";
import { cn } from "@/lib/utils";

/** One stop: header with the hero meter, the kill chain, Bring, condition and note. */
function StopBlock({ stop, d }: { stop: RouteStop; d: DerivedStop }) {
  const camp = d.camp;
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        {camp ? (
          <div className="min-w-0 pt-0.5 text-sm sm:flex sm:flex-wrap sm:items-center sm:gap-x-2">
            <span className="inline-flex items-center gap-1.5">
              <BandDot band={d.band} killed={d.left > 0 ? killedXpShare(camp, stop.kills) : undefined} />
              <span className="font-medium text-fg">{campLabel(camp)}</span>
            </span>
            <span className="flex items-center gap-1.5 pl-3.5 text-muted sm:pl-0">
              <span>
                {BAND_LABEL[camp.band] ?? camp.band} · Lv {camp.level}
              </span>
              <ChevronRight aria-hidden size={14} className="shrink-0 text-faint" />
            </span>
          </div>
        ) : (
          <p className="pt-0.5 text-sm font-medium text-fg">{stop.action || stop.campId || "-"}</p>
        )}
        {camp ? <HeroMeter level={d.heroLevelAfter} xp={d.xpAfter} /> : null}
      </div>

      {camp ? (
        <KillOrder
          kills={d.kills}
          ordered={hasKillOrder(stop)}
          skipped={hasKillOrder(stop) ? (unorderedCreeps(camp, stop.kills) as { creep: MapCampCreep; row: number }[]) : []}
        />
      ) : null}

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
 * The route as an ordered list of stop blocks. A click, Enter or Space on a
 * block toggles the shared selection (`onActiveChange`, lifted to the page so
 * the map agrees) and pins the camp card (`onOpenCard`). Hover is a local
 * preview only; focus alone never selects, since a click focuses first.
 * Blocks carry `data-stop`; map badges carry `data-stop-marker`.
 */
export function RouteStepTable({
  route,
  map,
  active = null,
  onActiveChange,
  onOpenCard,
}: {
  route: CreepRoute;
  map: CreepMap;
  /** Controlled: the selected stop index, or null. */
  active?: number | null;
  onActiveChange?: (index: number | null) => void;
  /** Pins the camp card for a camp stop's camp, alongside the selection toggle. */
  onOpenCard?: (camp: MapCamp, el: CampCardTrigger) => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const derived = useMemo(() => deriveRoute(route, map), [route, map]);

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-line/60 px-4 py-3 sm:px-5">
        <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">
          Route{" "}
          <span className="font-sans text-sm font-normal normal-case tracking-normal text-muted">
            · {route.stops.length} stops
          </span>
        </h2>
        <p className="mt-1 text-[0.8rem] text-muted">XP per kill at the hero&apos;s level at that moment.</p>
      </div>

      <ol>
        {route.stops.map((stop, i) => {
          const d = derived.stops[i];
          const isActive = i === active;
          const select = (el: HTMLElement) => {
            onActiveChange?.(active === i ? null : i);
            if (d.camp) onOpenCard?.(d.camp, el);
          };
          return (
            <li
              key={i}
              data-stop={i + 1}
              tabIndex={0}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
              onClick={(e) => select(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select(e.currentTarget);
                }
              }}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 border-t border-line/40 px-4 py-4 transition-colors first:border-t-0 sm:px-5",
                (isActive || i === hoverIndex) && "bg-gold/10",
              )}
            >
              <span className="tnum pt-1 text-center text-xs text-faint">
                {isActive ? (
                  <span aria-hidden className="inline-block size-2 rounded-full bg-gold shadow-[0_0_10px_var(--wg-gold-glow)]" />
                ) : (
                  i + 1
                )}
              </span>
              <StopBlock stop={stop} d={d} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
