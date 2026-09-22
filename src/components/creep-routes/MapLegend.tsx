import { cn } from "@/lib/utils";

/**
 * One line under the map (route page and editor alike) naming every mark
 * `CreepMap` draws: the three band dots and their level ranges, the
 * red/blue base X, and the gold-mine icon. No source attribution here by
 * design (F009-followup-2, user request) — the map icons are Blizzard art
 * hosted on Liquipedia, but that's a provenance note, not something a
 * reader needs; the source URLs and credit live in `docs/creep-routes.md`'s
 * "Map icons" section only. `flex-wrap` keeps it to one row on desktop and
 * lets it wrap on mobile without special-casing.
 */
export function MapLegend({ className }: { className?: string }) {
  return (
    <p className={cn("mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.68rem] text-faint", className)}>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: "var(--wg-camp-easy)" }} />
        Easy &le; 9
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: "var(--wg-camp-medium)" }} />
        Medium 10&ndash;19
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: "var(--wg-camp-hard)" }} />
        Hard &ge; 20
      </span>
      <span className="inline-flex items-center gap-1">
        <span aria-hidden className="text-loss">&times;</span>
        Your base
        <span aria-hidden className="text-win">&times;</span>
        Opponent
      </span>
      <span className="inline-flex items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- a ~14px
            legend glyph, not a real content image; no next/image benefit. */}
        <img src="/map-icons/gold-mine.png" alt="" aria-hidden width={14} height={12} className="inline-block" />
        Gold mine
      </span>
    </p>
  );
}
