import { cn } from "@/lib/utils";

/**
 * One line under the map (route page and editor alike) naming the marks a
 * reader has to decode: the three band dots with their level ranges, and the
 * gold-mine icon. The start markers are deliberately not listed — a red and a
 * blue X either side of a minimap need no caption, and naming them "your base"
 * asserted a side the reader may not be playing. No source attribution here by
 * design (F009-followup-2, user request) — the map icons are Blizzard art
 * hosted on Liquipedia, but that's a provenance note, not something a
 * reader needs; the source URLs and credit live in `docs/creep-routes.md`'s
 * "Map icons" section only. `flex-wrap` keeps it to one row on desktop and
 * lets it wrap on mobile without special-casing.
 */
export function MapLegend({ className, partial = false }: { className?: string; partial?: boolean }) {
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
        <img src="/map-icons/gold-mine.png" alt="" aria-hidden width={18} height={15} className="inline-block" />
        Gold mine
      </span>
      {partial ? (
        <span className="inline-flex items-center gap-1.5">
          {/* Same mark as a partly cleared camp: a wedge over a faded disc. */}
          <svg aria-hidden width="11" height="11" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="5" fill="var(--wg-camp-medium)" fillOpacity="0.3" />
            <path d="M5 5L5 0A5 5 0 0 1 5 10Z" fill="var(--wg-camp-medium)" />
          </svg>
          Partly cleared
        </span>
      ) : null}
    </p>
  );
}
