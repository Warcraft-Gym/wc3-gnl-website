import Link from "next/link";
import { cn } from "@/lib/utils";

/** Serif text lockup. A logo mark will sit in front of it once the final
 *  one lands. */
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
      aria-label="Warcraft 3 Gym, home"
      className={cn("group inline-flex items-center gap-3", className)}
    >
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
