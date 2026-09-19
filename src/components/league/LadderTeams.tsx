"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { LadderTeam } from "@/lib/api/types";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { TeamPlate } from "./VsBadge";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("en-US");

/** Team ladder table; each row expands to the team's players. */
export function LadderTeams({ teams }: { teams: LadderTeam[] }) {
  const [open, setOpen] = useState<number | null>(teams[0]?.id ?? null);
  const max = Math.max(1, ...teams.map((t) => t.points));

  return (
    <div className="grid gap-2.5">
      {teams.map((t, i) => {
        const isOpen = open === t.id;
        return (
          <div key={t.id} className="panel overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : t.id)}
              aria-expanded={isOpen}
              className="grid w-full grid-cols-[2rem_auto_minmax(0,1fr)_auto_1.5rem] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/40 sm:gap-4 sm:px-5"
            >
              <span
                className={cn(
                  "tnum skew inline-grid h-6 w-8 place-items-center text-xs font-extrabold",
                  i < 3 ? "bg-gold text-bg-deep" : "text-faint",
                )}
              >
                <span>{i + 1}</span>
              </span>
              <TeamPlate tag={t.tag ?? ""} logoUrl={t.logoUrl} name={t.name} size="md" />
              <div className="min-w-0">
                <p className="truncate font-display font-bold uppercase text-fg">{t.name}</p>
                <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded bg-surface-2">
                  <div className="h-full rounded bg-gold/80" style={{ width: `${(t.points / max) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-faint">
                  {fmt.format(t.games)} games · {t.players.filter((p) => p.games > 0).length} players active
                </p>
              </div>
              <div className="text-right">
                <p className="tnum font-display text-xl font-bold text-gold">{fmt.format(t.points)}</p>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">points</p>
              </div>
              <ChevronDown size={16} className={cn("text-faint transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen ? (
              <ul className="divide-y divide-line/50 border-t border-line/60">
                {t.players.map((p) => (
                  <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-4 py-2 text-sm sm:gap-6 sm:px-5">
                    <span className="flex min-w-0 items-center gap-2">
                      <RaceIcon race={p.race} size={20} />
                      <Link href={`/gnl/players/${p.slug}`} className="truncate text-muted transition-colors hover:text-gold">
                        {p.name}
                      </Link>
                      {p.achievements.length ? (
                        <span className="rounded border border-gold/30 px-1 font-mono text-[0.58rem] tracking-wide text-gold" title={p.achievements.map((a) => a.name).join(", ")}>
                          {p.achievements.length} ach
                        </span>
                      ) : null}
                    </span>
                    <span className="tnum text-xs text-faint">{p.wins}W {p.losses}L</span>
                    <span className="tnum text-xs text-faint" title="MMR change over the season">
                      {p.mmr.current}
                      <span className={p.mmr.current - p.mmr.start >= 0 ? "text-win" : "text-loss"}>
                        {" "}
                        {p.mmr.current - p.mmr.start >= 0 ? "+" : ""}
                        {p.mmr.current - p.mmr.start}
                      </span>
                    </span>
                    <span className="tnum w-14 text-right font-display font-bold text-fg">{fmt.format(p.points)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
