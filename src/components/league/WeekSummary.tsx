import type { TeamFixture } from "@/lib/api/types";
import { formatMatchTime } from "@/lib/utils";

/** Progress line above a week's fixtures, shown only while the week is in
 *  play: series played so far, games live now, and the next game up. A
 *  finished week has nothing to report, so it renders nothing. */
export function WeekSummary({ fixtures }: { fixtures: TeamFixture[] }) {
  const series = fixtures.flatMap((f) => f.matches);
  const played = series.filter((m) => m.status === "completed").length;
  const live = series.filter((m) => m.status === "live").length;
  const upcoming = series
    .filter((m) => m.status === "scheduled" && m.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];
  if (played === series.length && !live) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-l-2 border-gold/60 pl-4 text-sm text-muted">
      <span>
        <span className="tnum font-bold text-fg">{played}</span> of{" "}
        <span className="tnum font-bold text-fg">{series.length}</span> series played
      </span>
      {live ? (
        <span className="inline-flex items-center gap-1.5 text-live">
          <span className="live-dot size-1.5 rounded-full bg-live" aria-hidden />
          <span className="tnum font-bold">{live}</span> live now
        </span>
      ) : null}
      {upcoming ? (
        <span>
          Next up: <span className="text-fg">{upcoming.home.playerName}</span> vs{" "}
          <span className="text-fg">{upcoming.away.playerName}</span>
          <span className="text-faint">, {formatMatchTime(upcoming.scheduledAt)}</span>
        </span>
      ) : null}
    </div>
  );
}
