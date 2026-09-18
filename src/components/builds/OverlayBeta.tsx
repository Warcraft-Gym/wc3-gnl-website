import Link from "next/link";
import { ArrowRight, MonitorPlay } from "lucide-react";

/** One-line pointer from the build list to the overlay app page. */
export function OverlayBeta() {
  return (
    <Link
      href="/tools/overlay"
      className="panel group mt-6 flex items-center gap-4 border-arcane/40 px-5 py-4 transition-colors hover:border-arcane"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded border border-arcane/40 bg-arcane/10 text-arcane">
        <MonitorPlay size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[0.85rem] font-bold uppercase tracking-[0.08em] text-fg">
            Take a build into the game
          </span>
          <span className="rounded border border-arcane/50 px-1.5 py-0.5 font-mono text-[0.6rem] tracking-[0.16em] text-arcane">
            Beta
          </span>
        </span>
        <span className="mt-0.5 block text-sm text-muted">
          A desktop overlay floats any of these builds over Warcraft III. Looking for players to try it.
        </span>
      </span>
      <ArrowRight size={18} className="shrink-0 text-muted transition-colors group-hover:text-gold" />
    </Link>
  );
}
