import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo + serif lockup, in the spirit of the game-icon / title pairing in
 *  Blizzard's nav bar. The logo is a placeholder until the final mark lands. */
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
      <Image
        src="/logo/logo.png"
        alt=""
        width={44}
        height={44}
        className="size-11 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,.7)] transition-transform duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:scale-105"
      />
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
