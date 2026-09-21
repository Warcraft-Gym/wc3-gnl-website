"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { deriveRoute } from "@/lib/creep-routes/derive.mjs";
import { formatClock, toDayClock } from "@/lib/creep-routes/clock.mjs";
import type { CreepMap, CreepRoute } from "@/lib/creep-routes/types";
import { GameIcon } from "@/components/builds/GameIcon";
import { BandDot, NightMark } from "./RouteBadges";
import { cn } from "@/lib/utils";

/**
 * The route itself, play-along: press play and a game clock runs (250 ms
 * tick, same as `StepTable`); the row whose time has most recently passed
 * is highlighted and kept in view. The active index is reported to the
 * page via `onActiveChange` so `CreepMap` can glow the same stop. Every
 * row carries `data-stop`, the map's numbered badges carry
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
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const baseElapsed = useRef(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const derived = useMemo(() => deriveRoute(route, map), [route, map]);
  const times = route.stops.map((s) => s.time);

  useEffect(() => {
    if (!running) return;
    startedAt.current = performance.now();
    const id = window.setInterval(() => {
      if (startedAt.current === null) return;
      setElapsed(baseElapsed.current + (performance.now() - startedAt.current) / 1000);
    }, 250);
    return () => {
      window.clearInterval(id);
      if (startedAt.current !== null) {
        baseElapsed.current += (performance.now() - startedAt.current) / 1000;
        startedAt.current = null;
      }
    };
  }, [running]);

  let active = -1;
  if (running || elapsed > 0) {
    times.forEach((t, i) => {
      if (t <= elapsed) active = i;
    });
  }

  useEffect(() => {
    onActiveChange?.(active >= 0 ? active : null);
  }, [active, onActiveChange]);

  useEffect(() => {
    if (active < 0) return;
    rowRefs.current[active]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  function reset() {
    setRunning(false);
    baseElapsed.current = 0;
    startedAt.current = null;
    setElapsed(0);
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-3 sm:px-5">
        <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">
          Route{" "}
          <span className="font-sans text-sm font-normal normal-case tracking-normal text-muted">
            · {route.stops.length} stops
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="tnum min-w-[7.5rem] text-right font-display text-base font-bold text-gold sm:text-lg">
            {toDayClock(Math.max(0, elapsed))}{" "}
            <span className="text-muted">{`· ${formatClock(elapsed)}`}</span>
          </span>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            aria-label={running ? "Pause" : "Play"}
            className="btn-gold grid size-9 place-items-center rounded"
          >
            {running ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset"
            className="grid size-9 place-items-center rounded border border-line text-muted transition-colors hover:border-gold/60 hover:text-gold"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
              <th className="w-8 px-3 py-2.5 text-center font-medium sm:px-4">#</th>
              <th className="w-20 px-2 py-2.5 font-medium">Day clock</th>
              <th className="w-14 px-2 py-2.5 font-medium">Clock</th>
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
              const isPast = active >= 0 && i < active;
              return (
                <tr
                  key={i}
                  data-stop={i + 1}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  aria-current={isActive ? "step" : undefined}
                  className={cn("border-t border-line/40 transition-colors", isActive && "bg-gold/10", isPast && "text-faint")}
                >
                  <td className="tnum px-3 py-2.5 text-center text-xs text-faint sm:px-4">
                    {isActive ? (
                      <span aria-hidden className="inline-block size-2 rounded-full bg-gold shadow-[0_0_10px_var(--wg-gold-glow)]" />
                    ) : (
                      i + 1
                    )}
                  </td>
                  <td className="tnum px-2 py-2.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      {d.dayClock}
                      {d.isNight ? <NightMark /> : null}
                    </span>
                  </td>
                  <td className="tnum px-2 py-2.5 text-xs text-muted">{formatClock(stop.time)}</td>
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
