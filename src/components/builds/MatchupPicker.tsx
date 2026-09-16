"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { RaceIcon } from "@/components/ui/RaceIcon";
import {
  BUILD_DIFFICULTIES,
  BUILD_RACES,
  type BuildDifficulty,
  type BuildRace,
  type BuildVsRace,
} from "@/lib/builds/types";
import { cn } from "@/lib/utils";

type Side = "race" | "vs";

/** One large labelled crest. "Any" uses the random mark on a plain plate. */
function Crest({
  id,
  label,
  active,
  onClick,
}: {
  id: BuildRace | "any";
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group flex w-[4.25rem] flex-col items-center gap-1.5 sm:w-20"
    >
      <span
        className={cn(
          "relative grid size-14 place-items-center rounded-full border-2 transition-[border-color,box-shadow,transform,opacity] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 sm:size-[4.25rem]",
          active
            ? "border-gold bg-gold/10 shadow-[0_0_0_4px_rgba(0,0,0,.5),0_0_28px_-4px_var(--wg-gold-glow)]"
            : "border-line-strong/60 bg-surface/70 opacity-80 group-hover:opacity-100 group-hover:border-gold/50",
        )}
      >
        {id === "any" ? (
          <RaceIcon race="random" size={30} />
        ) : (
          <Image
            src={`/factions/large/${id}.webp`}
            alt=""
            width={64}
            height={64}
            className="size-11 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,.8)] sm:size-[3.25rem]"
          />
        )}
      </span>
      <span
        className={cn(
          "font-display text-[0.6rem] font-bold uppercase leading-none tracking-[0.12em] transition-colors",
          active ? "text-gold" : "text-muted group-hover:text-fg",
        )}
      >
        {label}
      </span>
    </button>
  );
}

const OPTIONS: { id: BuildRace | "any"; label: string }[] = [
  { id: "any", label: "Any" },
  ...BUILD_RACES,
];

/**
 * Matchup picker + filter bar. Everything lives in the URL (?race=&vs=&q=
 * &difficulty=&sort=) so filtered views are shareable, and every control
 * applies immediately — search debounced, the rest on change.
 */
export function MatchupPicker({
  race,
  vsRace,
  q,
  difficulty,
  sort,
  count,
}: {
  race?: BuildRace;
  vsRace?: BuildVsRace;
  q?: string;
  difficulty?: BuildDifficulty;
  sort: "title" | "updated";
  count: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(q ?? "");
  const debounce = useRef<number | null>(null);

  function set(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (query === (q ?? "")) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => set({ q: query.trim() || undefined }), 300);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pick = (side: Side, id: BuildRace | "any") => {
    const current = side === "race" ? race : vsRace;
    set({ [side]: id === "any" || current === id ? undefined : id });
  };

  const select =
    "h-10 rounded border border-line bg-surface/60 px-3 text-sm text-fg focus:border-gold/60 focus:outline-none";

  return (
    <div>
      {/* Crests */}
      <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
        <div className="flex flex-col items-center gap-2">
          <span className="kicker">Your race</span>
          <div className="flex gap-1 sm:gap-2">
            {OPTIONS.map((o) => (
              <Crest key={o.id} id={o.id} label={o.label} active={(race ?? "any") === o.id} onClick={() => pick("race", o.id)} />
            ))}
          </div>
        </div>
        <span className="font-display text-2xl font-extrabold uppercase tracking-[0.2em] text-foil lg:mt-9">
          vs
        </span>
        <div className="flex flex-col items-center gap-2">
          <span className="kicker">Against</span>
          <div className="flex gap-1 sm:gap-2">
            {OPTIONS.map((o) => (
              <Crest key={o.id} id={o.id} label={o.label} active={(vsRace ?? "any") === o.id} onClick={() => pick("vs", o.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search builds, tags, authors…"
            className="h-10 w-full rounded border border-line bg-surface/60 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-2">
          <select
            aria-label="Difficulty"
            value={difficulty ?? ""}
            onChange={(e) => set({ difficulty: e.target.value || undefined })}
            className={cn(select, "flex-1 sm:flex-none")}
          >
            <option value="">Any difficulty</option>
            {BUILD_DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => set({ sort: e.target.value === "title" ? undefined : e.target.value })}
            className={cn(select, "flex-1 sm:flex-none")}
          >
            <option value="updated">Recently updated</option>
            <option value="title">A–Z</option>
          </select>
          <span className="tnum hidden whitespace-nowrap pl-2 text-xs text-faint sm:inline">
            {count} {count === 1 ? "build" : "builds"}
          </span>
        </div>
      </div>
    </div>
  );
}
