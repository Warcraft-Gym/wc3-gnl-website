"use client";

import { useState } from "react";
import type { TeamFixture } from "@/lib/api/types";
import { FixtureCard } from "@/components/league/FixtureCard";
import { cn } from "@/lib/utils";

type Tab = "all" | "upcoming" | "results";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "results", label: "Results" },
];

export function TrendingMatches({
  live,
  upcoming,
  results,
}: {
  live: TeamFixture[];
  upcoming: TeamFixture[];
  results: TeamFixture[];
}) {
  const [tab, setTab] = useState<Tab>("all");

  const sets: Record<Tab, TeamFixture[]> = {
    all: [...live, ...upcoming, ...results].slice(0, 6),
    upcoming: [...live, ...upcoming].slice(0, 6),
    results: results.slice(0, 6),
  };
  const shown = sets[tab];

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "skew border px-5 py-2 font-display text-sm font-bold uppercase tracking-wider transition-colors",
              tab === t.key
                ? "border-gold bg-gold text-bg-deep"
                : "border-line text-muted hover:border-gold/60 hover:text-gold",
            )}
          >
            <span className="[transform:skewX(calc(var(--wg-skew)*-1))]">
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((f) => (
            <FixtureCard key={f.id} fixture={f} />
          ))}
        </div>
      ) : (
        <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
          Nothing here right now — check back soon.
        </p>
      )}
    </div>
  );
}
