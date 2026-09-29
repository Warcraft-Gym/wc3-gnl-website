import { heroXpForLevel } from "@/lib/creep-routes/xp.mjs";
import { cn } from "@/lib/utils";

/**
 * The hero after a stop: "Lv N", "xp / next-level xp", and a thin gold bar
 * for the share of the way to the next level. Stacked and right-aligned from
 * `sm` up; on a phone the two text parts share a line over a full-width bar.
 */
export function HeroMeter({ level, xp, className }: { level: number; xp: number; className?: string }) {
  const floor = heroXpForLevel(level);
  const next = heroXpForLevel(level + 1);
  const share = Math.min(Math.max((xp - floor) / (next - floor), 0), 1);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 sm:block sm:w-32 sm:shrink-0 sm:text-right", className)}>
      <p className="font-display text-[1.15rem] font-bold leading-none text-fg">Lv {level}</p>
      <p className="tnum text-[0.75rem] text-muted sm:mt-1">
        {xp} / {next} xp
      </p>
      <div aria-hidden className="mt-1.5 h-[3px] basis-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gold" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}
