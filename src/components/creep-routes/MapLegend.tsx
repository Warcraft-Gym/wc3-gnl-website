import { cn } from "@/lib/utils";
import { flatStops } from "@/lib/creep-routes/stop-numbers.mjs";
import type { RouteStop } from "@/lib/creep-routes/types";
import { PlaceIcon } from "./PlaceGlyph";

/** Which route marks a route draws, so the legend lists only those: an attack. */
export function routeLegendMarks(stops: Pick<RouteStop, "split" | "place">[]) {
  return {
    attack: (flatStops(stops) as { stop: Pick<RouteStop, "place"> }[]).some(({ stop }) => stop.place?.kind === "attack"),
  };
}

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
 * lets it wrap on mobile without special-casing. A route mark (an attack) gets
 * an entry only when the route has one.
 */
export function MapLegend({
  className,
  attack = false,
}: {
  className?: string;
  /** The route has an attack stop: red swords. */
  attack?: boolean;
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
      {/* Route marks get an entry only when the route has them. */}
      {attack ? (
        <span className="inline-flex items-center gap-1.5">
          <PlaceIcon kind="attack" className="text-loss" />
          Attack
        </span>
      ) : null}
    </p>
  );
}
