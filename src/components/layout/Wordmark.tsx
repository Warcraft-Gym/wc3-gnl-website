import Link from "next/link";
import { cn } from "@/lib/utils";

/** Emblem + serif lockup, in the spirit of the game-icon / title pairing
 *  in Blizzard's nav bar. */
export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Warcraft 3 Gym — home"
      className={cn("group inline-flex items-center gap-3", className)}
    >
      <span
        aria-hidden
        className="btn-gold grid size-10 shrink-0 place-items-center rounded font-display text-[0.95rem] font-extrabold tracking-tight"
      >
        W3
      </span>
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[0.95rem] font-bold uppercase tracking-[0.12em] text-fg">
            Warcraft&nbsp;3
          </span>
          <span className="mt-1 font-display text-[0.6rem] font-bold uppercase tracking-[0.42em] text-gold">
            Gym
          </span>
        </span>
      )}
    </Link>
  );
}
