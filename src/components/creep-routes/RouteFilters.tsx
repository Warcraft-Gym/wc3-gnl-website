"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { CREST_OPTIONS, RaceCrest, type CrestOption } from "@/components/builds/RaceCrestPicker";
import type { BuildRace, BuildVsRace } from "@/lib/builds/types";
import { ROUTE_LEVELS, type RouteLevel } from "@/lib/creep-routes/types";
import { DIFFICULTY_EXPLANATION } from "./RouteSetup";
import { cn } from "@/lib/utils";

type Side = "race" | "vs";

// Standard first, matching how routes skew (most fixtures are standard).
const LEVEL_OPTIONS = [...ROUTE_LEVELS].reverse();

/**
 * Route list's matchup + filter bar. `MatchupPicker`'s own `difficulty`
 * prop is a `BuildDifficulty` (beginner/intermediate/advanced) and can't be
 * repurposed as a route `level` (standard/beginner) or carry a map select,
 * so this is a sibling component with the same look and the same
 * URL-is-the-state pattern (?race=&vs=&map=&level=&q=&sort=): every control
 * applies immediately except search, which is debounced.
 */
export function RouteFilters({
  race,
  vsRace,
  map,
  level,
  q,
  sort,
  maps,
  count,
}: {
  race?: BuildRace;
  vsRace?: BuildVsRace;
  map?: string;
  level?: RouteLevel;
  q?: string;
  sort: "title" | "updated";
  maps: { slug: string; name: string }[];
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

  const pick = (side: Side, id: CrestOption) => {
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
            {CREST_OPTIONS.map((o) => (
              <RaceCrest key={o.id} id={o.id} label={o.label} active={(race ?? "any") === o.id} onClick={() => pick("race", o.id)} />
            ))}
          </div>
        </div>
        <span className="font-display text-2xl font-extrabold uppercase tracking-[0.2em] text-foil lg:mt-9">
          vs
        </span>
        <div className="flex flex-col items-center gap-2">
          <span className="kicker">Against</span>
          <div className="flex gap-1 sm:gap-2">
            {CREST_OPTIONS.map((o) => (
              <RaceCrest key={o.id} id={o.id} label={o.label} active={(vsRace ?? "any") === o.id} onClick={() => pick("vs", o.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search routes, maps, authors…"
            aria-label="Search creep routes"
            className="h-10 w-full rounded border border-line bg-surface/60 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Map"
            value={map ?? ""}
            onChange={(e) => set({ map: e.target.value || undefined })}
            className={cn(select, "flex-1 sm:flex-none")}
          >
            <option value="">Any map</option>
            {maps.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Difficulty"
            title={DIFFICULTY_EXPLANATION}
            value={level ?? ""}
            onChange={(e) => set({ level: e.target.value || undefined })}
            className={cn(select, "flex-1 sm:flex-none")}
          >
            <option value="">Any difficulty</option>
            {LEVEL_OPTIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
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
            {count} {count === 1 ? "route" : "routes"}
          </span>
        </div>
      </div>
    </div>
  );
}
