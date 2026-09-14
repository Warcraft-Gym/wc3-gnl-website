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
    all: [...live, ...upcoming, ...results].slice(0, 5),
    upcoming: [...live, ...upcoming].slice(0, 5),
    results: results.slice(0, 5),
  };
  const shown = sets[tab];

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "rounded border px-5 py-2 font-display text-[0.72rem] font-bold uppercase tracking-[0.12em] transition-colors",
              tab === t.key
                ? "btn-gold border-transparent"
                : "border-line bg-surface/40 text-muted hover:border-gold/60 hover:text-gold",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length ? (
        <div className="flex flex-col gap-3">
          {shown.map((f) => (
            <FixtureCard key={f.id} fixture={f} />
          ))}
        </div>
      ) : (
        <p className="rounded border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
          Nothing here right now — check back soon.
        </p>
      )}
    </div>
  );
}
