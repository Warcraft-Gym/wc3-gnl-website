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
 * lets it wrap on mobile without special-casing. A route mark (a leg without
 * the hero, a dashed leg of another way) gets an entry only when the route has one.
 */
export function MapLegend({
  className,
  heroAbsent = false,
  anotherWay = false,
}: {
  className?: string;
  heroAbsent?: boolean;
  /** The route has an "either" fork: its unchosen arms draw dashed. */
  anotherWay?: boolean;
}) {
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
      {/* Route marks get an entry only when the route has them. */}
      {heroAbsent ? (
        <span className="inline-flex items-center gap-1.5">
          <LegendLine opacity={0.55} />
          Without the hero
        </span>
      ) : null}
      {anotherWay ? (
        <span className="inline-flex items-center gap-1.5">
          <LegendLine opacity={0.55} dash="4 3" />
          Another way
        </span>
      ) : null}
    </p>
  );
}

/** A short stretch of the route line (`RoutePath`'s 2px light stroke). */
function LegendLine({ opacity = 1, dash }: { opacity?: number; dash?: string }) {
  return (
    <svg aria-hidden width={20} height={6} viewBox="0 0 20 6" className="inline-block">
      <line x1={1} y1={3} x2={19} y2={3} stroke="rgba(255,255,255,.85)" strokeWidth={2} strokeLinecap={dash ? "butt" : "round"} strokeDasharray={dash} opacity={opacity} />
    </svg>
  );
}
