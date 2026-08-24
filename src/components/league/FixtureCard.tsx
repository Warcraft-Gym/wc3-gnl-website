import Link from "next/link";
import type { TeamFixture } from "@/lib/api/types";
import { Surface } from "@/components/ui/Surface";
import { LiveBadge } from "@/components/ui/Badge";
import { TeamPlate, VsBadge } from "./VsBadge";
import { cn, formatMatchTime } from "@/lib/utils";

/** Compact team-vs-team fixture card for home / team spotlights. */
export function FixtureCard({ fixture }: { fixture: TeamFixture }) {
  const done = fixture.status === "completed";
  const homeWon = done && fixture.home.score > fixture.away.score;
  const awayWon = done && fixture.away.score > fixture.home.score;
  const showScore = fixture.status !== "scheduled";

  return (
    <Surface interactive className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[0.66rem] font-bold uppercase tracking-[0.18em] text-faint">
          Week {fixture.week}
        </span>
        {fixture.status === "live" ? (
          <LiveBadge />
        ) : (
          <span className="font-mono text-[0.7rem] uppercase text-muted">
            {done ? "Final" : formatMatchTime(fixture.scheduledAt)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={`/gnl/teams/${fixture.home.slug}`}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <TeamPlate
            tag={fixture.home.tag}
            logoUrl={fixture.home.logoUrl}
            name={fixture.home.name}
            size="sm"
          />
          <span
            className={cn(
              "truncate font-display text-sm font-bold uppercase",
              homeWon || !done ? "text-fg" : "text-muted",
            )}
          >
            {fixture.home.name}
          </span>
        </Link>

        {showScore ? (
          <span className="tnum shrink-0 font-display text-xl font-extrabold text-fg">
            <span className={homeWon ? "text-gold" : undefined}>
              {fixture.home.score}
            </span>
            <span className="mx-1 text-faint">:</span>
            <span className={awayWon ? "text-gold" : undefined}>
              {fixture.away.score}
            </span>
          </span>
        ) : (
          <VsBadge className="shrink-0" />
        )}

        <Link
          href={`/gnl/teams/${fixture.away.slug}`}
          className="flex min-w-0 flex-1 items-center justify-end gap-2.5 text-right"
        >
          <span
            className={cn(
              "truncate font-display text-sm font-bold uppercase",
              awayWon || !done ? "text-fg" : "text-muted",
            )}
          >
            {fixture.away.name}
          </span>
          <TeamPlate
            tag={fixture.away.tag}
            logoUrl={fixture.away.logoUrl}
            name={fixture.away.name}
            size="sm"
          />
        </Link>
      </div>
    </Surface>
  );
}
