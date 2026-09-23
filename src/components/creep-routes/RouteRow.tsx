import Link from "next/link";
import { PlayCircle, Link as LinkIcon } from "lucide-react";
import Image from "next/image";
import { TagChip, VsRaces } from "@/components/builds/BuildBadges";
import { LevelBadge } from "@/components/creep-routes/RouteBadges";
import { BUILD_RACES } from "@/lib/builds/types";
import type { CreepRoute, RouteLevel } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";

const RACE_LABEL = Object.fromEntries(BUILD_RACES.map((r) => [r.id, r.label]));

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}

/** Left-edge accent by level, the same quieter signal `BuildRow` uses for
 *  difficulty. */
const ACCENT: Record<RouteLevel, string> = {
  beginner: "before:bg-win",
  standard: "before:bg-gold",
};

/** One route in the list: the **map thumbnail** leads (F009-followup-3, user
 *  request: "the map icons are more important than the race for creep
 *  routes") · title + a map-name line (display font, full colour) + summary
 *  · meta column, where the race crest now lives, small, next to the `vs`
 *  opponents. Copies `BuildRow`'s grid so the two list pages read as one
 *  family. Carries `data-route="<slug>"` for tests and the User-Testing
 *  Validator; exactly one per rendered route. */
export function RouteRow({ route }: { route: CreepRoute }) {
  return (
    <li>
      <Link
        href={`/learn/creep-routes/${route.slug}`}
        data-route={route.slug}
        className={cn(
          "panel group relative grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 overflow-hidden py-3 pl-4 pr-4 transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-x-5 sm:pl-5",
          "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:opacity-80",
          ACCENT[route.level],
        )}
      >
        {/* The map leads the row now, not the race crest (F009-followup-3):
         *  the user's request treats the map as the primary fact for a
         *  creep route, ranked above the race. 64px, a dark square behind
         *  `object-contain` so a letterboxed 256x192 minimap (e.g. Echo
         *  Isles) shows in full, never cropped (item 6). */}
        {route.map.minimapUrl ? (
          <Image
            src={route.map.minimapUrl}
            alt=""
            width={64}
            height={64}
            className="size-16 shrink-0 rounded bg-black/40 object-contain ring-1 ring-gold/40 transition-transform duration-[var(--wg-dur)] group-hover:scale-105"
          />
        ) : (
          <span className="size-16 shrink-0 rounded bg-surface/60 ring-1 ring-line/60" aria-hidden />
        )}

        <div className="min-w-0">
          <h3 className="text-[0.98rem] font-bold leading-snug tracking-[0.05em] text-fg transition-colors group-hover:text-gold max-sm:line-clamp-2 sm:truncate">
            {route.title}
          </h3>
          {/* The map name, one line under the title, full text colour and
           *  the display font — the thumbnail above already carries the
           *  map's picture, so this line is text-only, no second small
           *  icon (F009-followup-3). */}
          <p className="mt-0.5 font-display text-[0.93rem] font-bold tracking-[0.03em] text-fg">
            <span className="truncate">{route.map.name}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted max-sm:line-clamp-2 sm:line-clamp-1">{route.summary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {/* The race crest, demoted to a secondary mark next to the `vs`
             *  opponents — 24px, down from the old 48/56px leading crest
             *  (F009-followup-3). */}
            <span className="inline-flex items-center gap-1.5">
              <Image
                src={`/factions/large/${route.race}.webp`}
                alt={RACE_LABEL[route.race]}
                width={24}
                height={24}
                className="size-6 shrink-0 object-contain"
              />
              <span className="text-faint">vs</span>
              <VsRaces vsRaces={route.vsRaces} size={14} />
            </span>
            {route.mapVersion ? (
              <>
                <span className="text-faint">·</span>
                <span>map v{route.mapVersion}</span>
              </>
            ) : null}
            <span className="text-faint">·</span>
            <span>{route.stops.length} stops</span>
            <span className="text-faint">·</span>
            <span>by {route.author}</span>
            {/* Whether a route comes with a video or a cited source is worth
                knowing before you open it — a route with a VOD is a different
                proposition from a bare camp list. Icons rather than words:
                the line is already dense, and each carries its own label for
                anyone not reading by sight. */}
            {route.videoUrl ? (
              <span className="inline-flex items-center gap-1 text-gold" title="Includes a video">
                <PlayCircle size={12} aria-hidden />
                <span className="sr-only">Includes a video</span>
              </span>
            ) : null}
            {route.sourceUrl ? (
              <span className="inline-flex items-center gap-1 text-muted" title="Has a source link">
                <LinkIcon size={12} aria-hidden />
                <span className="sr-only">Has a source link</span>
              </span>
            ) : null}
            {route.tags?.slice(0, 3).map((t) => (
              <TagChip key={t}>{t}</TagChip>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-between gap-3 border-t border-line/50 pt-2 text-xs text-faint sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5 sm:border-0 sm:pt-0">
          <LevelBadge level={route.level} />
          <span className="tnum whitespace-nowrap">
            {formatDate(route.updatedAt)} · {route.stops.length} stop{route.stops.length === 1 ? "" : "s"}
          </span>
        </div>
      </Link>
    </li>
  );
}
