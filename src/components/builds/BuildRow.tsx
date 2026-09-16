import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DifficultyBadge, Matchup, TagChip } from "./BuildBadges";
import type { BuildOrder } from "@/lib/builds/types";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

/** One build in the list: a panel row on all sizes (tables don't survive
 *  phones), with the essentials in a predictable order. */
export function BuildRow({ build }: { build: BuildOrder }) {
  return (
    <li>
      <Link
        href={`/learn/builds/${build.slug}`}
        className="panel group grid gap-3 p-4 transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-5"
      >
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[1rem] font-bold leading-snug tracking-[0.05em] text-fg transition-colors group-hover:text-gold">
              {build.title}
            </h3>
            <ArrowUpRight size={18} className="mt-0.5 shrink-0 text-faint transition-colors group-hover:text-gold sm:hidden" />
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{build.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Matchup race={build.race} vsRace={build.vsRace} size={18} />
            <DifficultyBadge level={build.difficulty} />
            {build.tags.slice(0, 3).map((t) => (
              <TagChip key={t}>{t}</TagChip>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs text-faint sm:flex-col sm:items-end sm:gap-1 sm:text-right">
          <span className="text-muted">by {build.author}</span>
          <span className="tnum">{build.patch ? `Patch ${build.patch} · ` : ""}{formatDate(build.updatedAt)}</span>
        </div>
      </Link>
    </li>
  );
}

/** Spotlight card for Build of the week / Trending. */
export function BuildSpotlight({
  label,
  build,
}: {
  label: string;
  build: BuildOrder;
}) {
  return (
    <Link
      href={`/learn/builds/${build.slug}`}
      className="panel group relative flex flex-col justify-end overflow-hidden p-5 transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50 sm:min-h-[11rem]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{ backgroundImage: "radial-gradient(24rem 12rem at 90% 110%, var(--wg-gold-glow), transparent 65%)" }}
      />
      <p className="kicker">{label}</p>
      <h3 className="mt-2 text-[1.15rem] font-bold leading-snug tracking-[0.05em] text-fg transition-colors group-hover:text-gold">
        {build.title}
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Matchup race={build.race} vsRace={build.vsRace} size={18} />
        <span className="text-xs text-muted">by {build.author}</span>
      </div>
    </Link>
  );
}
