import Link from "next/link";
import { cn } from "@/lib/utils";

/** Angular esports wordmark: skewed accent plate + condensed lockup. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Warcraft 3 Gym — home"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden
        className="skew grid size-9 place-items-center bg-gold font-display text-lg font-extrabold text-bg-deep transition-shadow group-hover:shadow-[0_0_24px_-4px_var(--wg-gold-glow)]"
      >
        <span>W3</span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-extrabold uppercase tracking-tight text-fg">
          Warcraft&nbsp;3
        </span>
        <span className="mt-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.44em] text-gold">
          Gym
        </span>
      </span>
    </Link>
  );
}
