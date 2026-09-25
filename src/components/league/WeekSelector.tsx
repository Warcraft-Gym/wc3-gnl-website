import { SeasonLink as Link } from "./SeasonLink";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Week } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Week tabs with their dates, and prev/next arrows at the ends. */
export function WeekSelector({ weeks, active }: { weeks: Week[]; active: number }) {
  const idx = weeks.findIndex((w) => w.number === active);
  const prev = idx > 0 ? weeks[idx - 1] : undefined;
  const next = idx >= 0 && idx < weeks.length - 1 ? weeks[idx + 1] : undefined;

  const arrow = (w: Week | undefined, Icon: typeof ChevronLeft, label: string) =>
    w ? (
      <Link
        href={`/gnl/schedule/${w.number}`}
        aria-label={`${label}, week ${w.number}`}
        className="grid size-9 shrink-0 place-items-center rounded border border-line bg-surface/60 text-muted transition-colors hover:border-gold/60 hover:text-gold"
      >
        <Icon size={18} />
      </Link>
    ) : (
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded border border-line/40 bg-surface/30 text-faint/40">
        <Icon size={18} />
      </span>
    );

  return (
    <nav aria-label="Weeks" className="flex items-center gap-2 sm:gap-3">
      {arrow(prev, ChevronLeft, "Previous week")}
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
        {weeks.map((w) => {
          const isActive = w.number === active;
          return (
            <Link
              key={w.number}
              href={`/gnl/schedule/${w.number}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex shrink-0 flex-col items-center border px-3 py-1.5 transition-colors sm:flex-1",
                isActive
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-line bg-surface/60 text-muted hover:border-gold/60 hover:text-gold",
              )}
            >
              <span className="flex items-center gap-1.5 font-display text-sm font-extrabold">
                <span className="tnum">Week {w.number}</span>
                {w.isCurrent ? (
                  <span className="rounded bg-gold px-1 font-mono text-[0.5rem] uppercase tracking-widest text-bg-deep">now</span>
                ) : null}
              </span>
              <span className="mt-0.5 whitespace-nowrap font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
                {w.label}
              </span>
            </Link>
          );
        })}
      </div>
      {arrow(next, ChevronRight, "Next week")}
    </nav>
  );
}
