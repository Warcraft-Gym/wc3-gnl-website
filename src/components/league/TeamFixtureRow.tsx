import { SeasonLink as Link } from "./SeasonLink";
import { ChevronRight } from "lucide-react";
import type { TeamFixture } from "@/lib/api/types";
import { LiveBadge } from "@/components/ui/Badge";
import { TeamPlate } from "./VsBadge";
import { record, resultLabel } from "@/lib/figures.mjs";
import { cn, formatMatchTime } from "@/lib/utils";

/**
 * One weekly fixture seen from one team's side, for the team page: the
 * opponent, the team's own points first in `win` or `loss`, and the series
 * won and lost inside it. The schedule shows the same fixture from no side.
 * See "Results" in DESIGN.md.
 */
export function TeamFixtureRow({ fixture, teamId }: { fixture: TeamFixture; teamId: number }) {
  const home = fixture.home.id === teamId;
  const us = home ? fixture.home : fixture.away;
  const them = home ? fixture.away : fixture.home;
  const done = fixture.status === "completed";
  const played = fixture.status !== "scheduled";
  const won = done && us.score > them.score;
  const lost = done && us.score < them.score;
  const series = fixture.matches.filter((m) => m.status === "completed");
  const seriesWon = series.filter((m) => (home ? m.home.score > m.away.score : m.away.score > m.home.score)).length;
  const seriesLost = series.filter((m) => (home ? m.home.score < m.away.score : m.away.score < m.home.score)).length;
  const seriesRecord = record(seriesWon, seriesLost);

  return (
    <li className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_7rem_auto_2rem] sm:gap-4">
      <div className="font-mono text-[0.62rem] uppercase leading-tight tracking-[0.14em] text-faint">
        Week {fixture.week}
        <span className="mt-0.5 block">{home ? "Home" : "Away"}</span>
      </div>

      <Link href={`/gnl/teams/${them.slug}`} className="flex min-w-0 items-center gap-2.5">
        <TeamPlate tag={them.tag} logoUrl={them.logoUrl} name={them.name} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-display text-sm font-bold uppercase text-fg transition-colors hover:text-gold">
            {them.name}
          </span>
          <span className="block text-xs text-faint">
            {fixture.status === "live" ? <LiveBadge /> : done ? "Final" : formatMatchTime(fixture.scheduledAt)}
          </span>
        </span>
      </Link>

      {/* Series won and lost inside the fixture; its unit sits in the list head. */}
      <span className="tnum hidden text-right font-mono text-xs text-muted sm:block">{seriesRecord ?? "—"}</span>

      {played ? (
        <span
          className={cn("tnum text-right font-display text-lg font-extrabold", won ? "text-win" : lost ? "text-loss" : "text-fg")}
          title={done ? resultLabel(us.score, them.score) : undefined}
          aria-label={done ? resultLabel(us.score, them.score) : `${us.score} : ${them.score}, in play`}
        >
          {us.score}
          <span className="mx-1 text-faint">:</span>
          {them.score}
        </span>
      ) : (
        <span className="text-right font-display text-sm font-bold uppercase text-faint">vs</span>
      )}

      <Link
        href={`/gnl/schedule/${fixture.week}`}
        aria-label={`Week ${fixture.week} on the schedule`}
        title="Every series of this week"
        className="hidden size-8 place-items-center rounded border border-line text-muted transition-colors hover:border-gold/60 hover:text-gold sm:grid"
      >
        <ChevronRight size={15} />
      </Link>
    </li>
  );
}
