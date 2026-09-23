"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { GameIcon } from "./GameIcon";
import { formatClock, parseClock, type BuildStep } from "@/lib/builds/types";
import { cn } from "@/lib/utils";

/**
 * The build order itself. Press play and a game clock runs; the row whose
 * time has most recently passed is highlighted and kept in view, so you can
 * follow along while the match loads. Steps without a time are never
 * auto-highlighted.
 */
export function StepTable({ steps }: { steps: BuildStep[] }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const baseElapsed = useRef(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const times = useMemo(() => steps.map((s) => parseClock(s.time)), [steps]);
  const hasClock = times.some((t) => t !== undefined);

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

  // Active = last timed step whose time has passed.
  let active = -1;
  if (running || elapsed > 0) {
    times.forEach((t, i) => {
      if (t !== undefined && t <= elapsed) active = i;
    });
  }

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
          Build order <span className="font-sans text-sm font-normal normal-case tracking-normal text-muted">· {steps.length} steps</span>
        </h2>
        {hasClock ? (
          <div className="flex items-center gap-2">
            <span className="tnum min-w-[3.5rem] text-right font-display text-lg font-bold text-gold">
              {formatClock(elapsed)}
            </span>
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              aria-label={running ? "Pause" : "Play"}
              className="btn-gold grid size-9 place-items-center rounded"
            >
              {running ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={reset}
              aria-label="Reset"
              className="grid size-9 place-items-center rounded border border-line text-muted transition-colors hover:border-gold/60 hover:text-gold"
            >
              <RotateCcw size={17} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
              <th className="w-10 px-3 py-2.5 text-center font-medium sm:px-4">#</th>
              {hasClock ? <th className="w-16 px-2 py-2.5 font-medium">Time</th> : null}
              <th className="w-14 px-2 py-2.5 text-center font-medium">Food</th>
              <th className="px-2 py-2.5 font-medium">Instruction</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => {
              const isActive = i === active;
              const isPast = active >= 0 && i < active;
              return (
                <tr
                  key={i}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  className={cn(
                    "border-t border-line/40 transition-colors",
                    isActive && "bg-gold/10",
                    isPast && "text-faint",
                  )}
                >
                  <td className="tnum px-3 py-2.5 text-center text-xs text-faint sm:px-4">
                    {isActive ? (
                      <span aria-hidden className="inline-block size-2 rounded-full bg-gold shadow-[0_0_10px_var(--wg-gold-glow)]" />
                    ) : (
                      i + 1
                    )}
                  </td>
                  {hasClock ? <td className="tnum px-2 py-2.5 text-xs text-muted">{s.time ?? "-"}</td> : null}
                  <td className="tnum px-2 py-2.5 text-center text-xs text-muted">
                    {s.supply != null ? s.supply : "-"}
                  </td>
                  <td className="px-2 py-2.5 pr-4">
                    <span className="flex items-center gap-2.5">
                      {s.icon ? <GameIcon iconKey={s.icon} size={32} /> : null}
                      <span className={cn("font-medium", isActive ? "text-fg" : isPast ? "text-muted" : "text-fg")}>
                        {s.instruction}
                      </span>
                    </span>
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
