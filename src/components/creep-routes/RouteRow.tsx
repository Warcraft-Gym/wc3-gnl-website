import Link from "next/link";
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

/** One route in the list: race crest · title + a map line (thumbnail + name,
 *  full text colour, F009-followup-2) + summary · meta column, copying
 *  `BuildRow`'s grid so the two list pages read as one family. Carries
 *  `data-route="<slug>"` for tests and the User-Testing Validator; exactly
 *  one per rendered route. */
export function RouteRow({ route }: { route: CreepRoute }) {
  return (
    <li>
      <Link
        href={`/learn/creep-routes/${route.slug}`}
        data-route={route.slug}
        className={cn(
          "panel group relative grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 overflow-hidden py-3 pl-4 pr-4 transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:gap-x-5 sm:pl-5",
          "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:opacity-80",
          ACCENT[route.level],
        )}
      >
        <Image
          src={`/factions/large/${route.race}.webp`}
          alt={RACE_LABEL[route.race]}
          width={64}
          height={64}
          className="size-12 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,.8)] transition-transform duration-[var(--wg-dur)] group-hover:scale-105 sm:size-14"
        />

        <div className="min-w-0">
          <h3 className="text-[0.98rem] font-bold leading-snug tracking-[0.05em] text-fg transition-colors group-hover:text-gold max-sm:line-clamp-2 sm:truncate">
            {route.title}
          </h3>
          {/* The map, one line under the title, full text colour and the
           *  display font — as prominent a fact as the route name itself
           *  (F009-followup-2, user request: "the map should be more
           *  visible on /learn/creep-routes too"). The meta line below
           *  keeps only "map v2.0", not the name, so it isn't said twice. */}
          <p className="mt-0.5 flex items-center gap-1.5 font-display text-[0.93rem] font-bold tracking-[0.03em] text-fg">
            {route.map.minimapUrl ? (
              <Image
                src={route.map.minimapUrl}
                alt=""
                width={28}
                height={28}
                className="size-7 shrink-0 rounded object-cover ring-1 ring-line/60"
              />
            ) : null}
            <span className="truncate">{route.map.name}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted max-sm:line-clamp-2 sm:line-clamp-1">{route.summary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
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
