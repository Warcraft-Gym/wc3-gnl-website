import { cn } from "@/lib/utils";

/**
 * One line under the map (route page and editor alike) naming the marks a
 * reader has to decode: the three band dots with their level ranges, and the
 * gold-mine and neutral-building icons. The start markers are deliberately not listed — a red and a
 * blue X either side of a minimap need no caption, and naming them "your base"
 * asserted a side the reader may not be playing. No source attribution here by
 * design (F009-followup-2, user request) — the map icons are Blizzard art
 * hosted on Liquipedia, but that's a provenance note, not something a
 * reader needs; the source URLs and credit live in `docs/creep-routes.md`'s
 * "Map icons" section only. `flex-wrap` keeps it to one row on desktop and
 * lets it wrap on mobile without special-casing.
 */
export function MapLegend({ className }: { className?: string }) {
  return (
    <p className={cn("mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted", className)}>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "var(--wg-camp-easy)" }} />
        Easy &le; 9
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "var(--wg-camp-medium)" }} />
        Medium 10&ndash;19
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "var(--wg-camp-hard)" }} />
        Hard &ge; 20
      </span>
      <span className="inline-flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- a small
            legend glyph, not a real content image; no next/image benefit. */}
        <img src="/map-icons/minimap-gold-mine.png" alt="" aria-hidden width={16} height={16} className="inline-block [image-rendering:pixelated]" />
        Gold mine
      </span>
      <span className="inline-flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- legend glyph, as above. */}
        <img src="/map-icons/minimap-neutral-building.png" alt="" aria-hidden width={16} height={16} className="inline-block [image-rendering:pixelated]" />
        Neutral building
      </span>
    </p>
  );
}
