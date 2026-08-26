import { ChevronDown, Star } from "lucide-react";
import type { FantasyEntry, FantasyBreakdown } from "@/lib/api/types";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { TeamPlate } from "@/components/league/VsBadge";
import { cn, raceOf } from "@/lib/utils";

const BREAKDOWN: { key: keyof FantasyBreakdown; label: string }[] = [
  { key: "player", label: "Players" },
  { key: "bench", label: "Bench" },
  { key: "team", label: "Team" },
  { key: "race", label: "Race" },
  { key: "bet", label: "Bets" },
];

function RankChip({ rank }: { rank: number }) {
  const top = rank <= 3;
  return (
    <span
      className={cn(
        "tnum skew inline-grid h-8 w-10 shrink-0 place-items-center font-display text-sm font-extrabold",
        top ? "bg-gold text-bg-deep" : "border border-line text-faint",
      )}
    >
      <span className="[transform:skewX(calc(var(--wg-skew)*-1))]">{rank}</span>
    </span>
  );
}

function FantasyRow({ entry }: { entry: FantasyEntry }) {
  return (
    <details className="group border-b border-line/60 last:border-0 open:bg-surface/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-2/50 sm:gap-4 sm:px-4 [&::-webkit-details-marker]:hidden">
        <RankChip rank={entry.rank} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold uppercase tracking-wide text-fg sm:text-base">
            {entry.name}
          </p>
          {entry.captain ? (
            <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[0.68rem] uppercase tracking-wide text-faint">
              <Star size={11} className="shrink-0 fill-gold text-gold" />
              <RaceIcon race={raceOf(entry.captain.race)} size={13} />
              <span className="truncate normal-case text-muted">
                {entry.captain.name}
              </span>
            </p>
          ) : null}
        </div>

        {/* drafted team + drafted race (hidden on the smallest screens) */}
        <div className="hidden items-center gap-3 sm:flex">
          {entry.draftedTeam ? (
            <TeamPlate
              tag={entry.draftedTeam.tag}
              name={entry.draftedTeam.name}
              logoUrl={entry.draftedTeam.logoUrl}
              size="sm"
            />
          ) : null}
          <span
            className="skew grid size-9 place-items-center border border-line bg-surface-2/60"
            title={`Drafted race`}
          >
            <RaceIcon
              race={raceOf(entry.draftedRace)}
              size={20}
              className="[transform:skewX(calc(var(--wg-skew)*-1))]"
            />
          </span>
        </div>

        <div className="shrink-0 text-right">
          <span className="tnum font-display text-xl font-extrabold text-gold sm:text-2xl">
            {entry.total}
          </span>
          <span className="ml-1 font-mono text-[0.6rem] uppercase tracking-widest text-faint">
            pts
          </span>
        </div>

        <ChevronDown
          size={16}
          className="shrink-0 text-faint transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="grid gap-6 border-t border-line/60 bg-bg-deep/30 px-4 py-5 lg:grid-cols-[1fr_1.2fr]">
        {/* point breakdown */}
        <div>
          <h4 className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.18em] text-faint">
            Points breakdown
          </h4>
          <ul className="mt-3 space-y-2">
            {BREAKDOWN.map(({ key, label }) => {
              const value = entry.breakdown[key];
              const pct = entry.total > 0 ? (value / entry.total) * 100 : 0;
              return (
                <li key={key} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-mono text-[0.62rem] uppercase tracking-wide text-muted">
                    {label}
                  </span>
                  <span className="relative h-2 flex-1 overflow-hidden bg-surface-2">
                    <span
                      className="absolute inset-y-0 left-0 bg-gold/70"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="tnum w-8 shrink-0 text-right font-display text-sm font-bold text-fg">
                    {value}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* drafted roster */}
        <div>
          <h4 className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.18em] text-faint">
            Drafted squad
          </h4>
          {entry.roster.length > 0 ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {entry.roster.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 border px-3 py-2",
                    p.isCaptain
                      ? "border-gold/40 bg-gold/5"
                      : "border-line bg-surface/40",
                  )}
                >
                  <RaceIcon race={raceOf(p.race)} size={18} />
                  <span className="truncate text-sm font-medium text-fg">
                    {p.name}
                  </span>
                  {p.isCaptain ? (
                    <Star
                      size={12}
                      className="ml-auto shrink-0 fill-gold text-gold"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-faint">No drafted players recorded.</p>
          )}
        </div>
      </div>
    </details>
  );
}

export function FantasyStandings({ entries }: { entries: FantasyEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="border border-line bg-surface/40 px-4 py-8 text-center text-sm text-faint">
        No fantasy squads for this season yet.
      </p>
    );
  }
  return (
    <div className="border border-line">
      {entries.map((entry) => (
        <FantasyRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
