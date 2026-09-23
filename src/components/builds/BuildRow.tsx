import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { DifficultyBadge, TagChip, VsRaces } from "./BuildBadges";
import { BUILD_RACES, type BuildDifficulty, type BuildOrder } from "@/lib/builds/types";
import { cn } from "@/lib/utils";

const RACE_LABEL = Object.fromEntries(BUILD_RACES.map((r) => [r.id, r.label]));

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}

/** Left-edge accent by difficulty, a quieter signal than another chip. */
const ACCENT: Record<BuildDifficulty, string> = {
  beginner: "before:bg-win",
  intermediate: "before:bg-arcane",
  advanced: "before:bg-gold",
};

/** One build in the list: race crest · title + summary · meta column. */
export function BuildRow({ build }: { build: BuildOrder }) {
  return (
    <li>
      <Link
        href={`/learn/builds/${build.slug}`}
        className={cn(
          "panel group relative grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 overflow-hidden py-3 pl-4 pr-4 transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:gap-x-5 sm:pl-5",
          "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:opacity-80",
          ACCENT[build.difficulty],
        )}
      >
        <Image
          src={`/factions/large/${build.race}.webp`}
          alt={RACE_LABEL[build.race]}
          width={64}
          height={64}
          className="size-12 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,.8)] transition-transform duration-[var(--wg-dur)] group-hover:scale-105 sm:size-14"
        />

        <div className="min-w-0">
          <h3 className="text-[0.98rem] font-bold leading-snug tracking-[0.05em] text-fg transition-colors group-hover:text-gold max-sm:line-clamp-2 sm:truncate">
            {build.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted max-sm:line-clamp-2 sm:line-clamp-1">{build.summary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="text-faint">vs</span>
              <VsRaces vsRaces={build.vsRaces} size={16} />
            </span>
            <span className="text-faint">·</span>
            <span>by {build.author}</span>
            {build.tags.slice(0, 3).map((t) => (
              <TagChip key={t}>{t}</TagChip>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-between gap-3 border-t border-line/50 pt-2 text-xs text-faint sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5 sm:border-0 sm:pt-0">
          <DifficultyBadge level={build.difficulty} />
          <span className="tnum whitespace-nowrap">
            {build.steps.length} steps{build.patch ? ` · ${build.patch}` : ""} · {formatDate(build.updatedAt)}
          </span>
        </div>
      </Link>
    </li>
  );
}

/** Build of the week, one wide card with the race's showcase art behind it. */
export function FeaturedBuild({ build }: { build: BuildOrder }) {
  return (
    <Link
      href={`/learn/builds/${build.slug}`}
      className="panel group relative block overflow-hidden transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/60"
    >
      <Image
        src={`/factions/headers/${build.race}.webp`}
        alt=""
        fill
        sizes="(max-width: 1200px) 100vw, 1200px"
        className="object-cover object-[70%_center] opacity-60 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.92)_0%,rgba(0,0,0,.75)_45%,rgba(0,0,0,.2)_100%)]"
      />
      <div className="relative grid gap-5 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-7 sm:p-8">
        <Image
          src={`/factions/large/${build.race}.webp`}
          alt=""
          width={128}
          height={128}
          className="size-20 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,.9)] sm:size-28"
        />
        <div className="min-w-0">
          <p className="kicker">Build of the week</p>
          <h2 className="mt-2 text-[clamp(1.3rem,1rem+1.4vw,1.9rem)] font-bold leading-tight tracking-[0.05em] text-fg [text-shadow:0_2px_16px_rgba(0,0,0,.9)]">
            {build.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted sm:text-[0.95rem]">{build.summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="font-bold text-fg">{RACE_LABEL[build.race]}</span>
              <span className="text-faint">vs</span>
              <VsRaces vsRaces={build.vsRaces} size={16} />
            </span>
            <DifficultyBadge level={build.difficulty} />
            <span>by {build.author}</span>
            <span className="ml-auto inline-flex items-center gap-1 font-display text-[0.68rem] font-bold uppercase tracking-[0.14em] text-gold">
              Open build <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
