import { cn } from "@/lib/utils";

/**
 * One line under the map (route page and editor alike) naming the marks a
 * reader has to decode: the three band dots with their level ranges. The
 * gold mine draws the game's own icon and needs no entry. The start markers are deliberately not listed — a red and a
 * blue X either side of a minimap need no caption, and naming them "your base"
 * asserted a side the reader may not be playing. No source attribution here by
 * design (F009-followup-2, user request) — the map icons are Blizzard art
 * hosted on Liquipedia, but that's a provenance note, not something a
 * reader needs; the source URLs and credit live in `docs/creep-routes.md`'s
 * "Map icons" section only. `flex-wrap` keeps it to one row on desktop and
 * lets it wrap on mobile without special-casing. No route marks: an attack's
 * red disc with its swords and its row's label say what it is (v2.9).
 */
export function MapLegend({ className }: { className?: string }) {
  return (
    <p className={cn("mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted", className)}>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "var(--wg-camp-easy)" }} />
        Easy &le; Lv 9
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "var(--wg-camp-medium)" }} />
        Medium Lv 10&ndash;19
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-2.5 rounded-full" style={{ background: "var(--wg-camp-hard)" }} />
        Hard &ge; Lv 20
      </span>
    </p>
  );
}
