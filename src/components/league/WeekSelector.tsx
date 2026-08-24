import Link from "next/link";
import type { Week } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function WeekSelector({
  weeks,
  active,
}: {
  weeks: Week[];
  active: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-[0.72rem] font-bold uppercase tracking-[0.2em] text-faint">
        Weeks
      </span>
      {weeks.map((w) => {
        const isActive = w.number === active;
        return (
          <Link
            key={w.number}
            href={`/gnl/schedule/${w.number}`}
            aria-current={isActive ? "page" : undefined}
            title={w.label}
            className={cn(
              "skew grid h-9 w-10 place-items-center border font-display text-sm font-extrabold transition-colors",
              isActive
                ? "border-gold bg-gold text-bg-deep"
                : "border-line text-muted hover:border-gold/60 hover:text-gold",
              w.isCurrent && !isActive && "border-gold/40 text-gold",
            )}
          >
            <span className="tnum">{w.number}</span>
          </Link>
        );
      })}
    </div>
  );
}
