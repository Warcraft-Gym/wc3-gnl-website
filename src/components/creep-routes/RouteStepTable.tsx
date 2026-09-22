"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deriveRoute } from "@/lib/creep-routes/derive.mjs";
import type { CreepMap, CreepRoute } from "@/lib/creep-routes/types";
import { GameIcon } from "@/components/builds/GameIcon";
import { BandDot } from "./RouteBadges";
import { cn } from "@/lib/utils";

/**
 * The route itself: an ordered table of stops, no time dimension. Hovering,
 * focusing or clicking a row lights it up and reports its index to the page
 * via `onActiveChange`, so `CreepMap` glows the same stop's marker — the
 * row <-> marker link this component always had, previously driven by a
 * play-along clock, now driven directly by the reader's own attention.
 * Every row carries `data-stop`, the map's numbered badges carry
 * `data-stop-marker` instead, so the two never double-count.
 */
export function RouteStepTable({
  route,
  map,
  onActiveChange,
}: {
  route: CreepRoute;
  map: CreepMap;
  onActiveChange?: (index: number | null) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const derived = useMemo(() => deriveRoute(route, map), [route, map]);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-3 sm:px-5">
        <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">
          Route{" "}
          <span className="font-sans text-sm font-normal normal-case tracking-normal text-muted">
            · {route.stops.length} stops
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
              <th className="w-8 px-3 py-2.5 text-center font-medium sm:px-4">#</th>
              <th className="px-2 py-2.5 font-medium">Camp</th>
              <th className="px-2 py-2.5 font-medium">Bring</th>
              <th className="px-2 py-2.5 font-medium">Note</th>
              <th className="w-28 px-2 py-2.5 font-medium">Level after</th>
            </tr>
          </thead>
          <tbody>
            {route.stops.map((stop, i) => {
              const d = derived.stops[i];
              const isActive = i === active;
              return (
                <tr
                  key={i}
                  data-stop={i + 1}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  tabIndex={0}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive((a) => (a === i ? null : a))}
                  onClick={() => setActive((a) => (a === i ? null : i))}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "cursor-pointer border-t border-line/40 transition-colors",
                    isActive && "bg-gold/10",
                  )}
                >
                  <td className="tnum px-3 py-2.5 text-center text-xs text-faint sm:px-4">
                    {isActive ? (
                      <span aria-hidden className="inline-block size-2 rounded-full bg-gold shadow-[0_0_10px_var(--wg-gold-glow)]" />
                    ) : (
                      i + 1
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    {d.camp ? (
                      <span className="inline-flex items-center gap-1.5">
                        <BandDot band={d.band} /> {`Camp ${d.camp.id}`}
                      </span>
                    ) : (
                      <span className="text-muted">{stop.action ?? "-"}</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    {stop.units?.length ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {stop.units.map((u, ui) => (
                          <span key={ui} className="inline-flex items-center gap-1">
                            <GameIcon iconKey={u.icon} size={22} />
                            {u.count > 1 ? <span className="tnum text-xs text-faint">×{u.count}</span> : null}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-faint">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted">
                    <span className="flex flex-col gap-1">
                      {stop.note ? <span>{stop.note}</span> : null}
                      {stop.condition ? (
                        <span className="inline-flex w-fit items-center rounded border border-arcane/40 bg-arcane/10 px-1.5 py-0.5 text-[0.65rem] text-arcane">
                          if {stop.condition}
                        </span>
                      ) : null}
                      {!stop.note && !stop.condition ? <span className="text-faint">-</span> : null}
                    </span>
                  </td>
                  <td className="tnum px-2 py-2.5 text-xs text-muted">
                    {`Lv ${d.heroLevelAfter} · ${d.xpAfter} xp`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
