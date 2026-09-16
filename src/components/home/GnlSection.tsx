import type { Season, StandingRow, Team } from "@/lib/api/types";
import { StandingsTable } from "@/components/league/StandingsTable";
import { TeamMedallions } from "@/components/home/TeamMedallions";
import { ButtonLink } from "@/components/ui/Button";
import { DISCORD_URL } from "@/lib/links";
import { DiscordIcon } from "@/components/ui/DiscordIcon";

/** The league, in one compact section: what it is, where the season stands,
 *  the top of the table and the crests. */
export function GnlSection({
  season,
  rows,
  teams,
}: {
  season: Season;
  rows: StandingRow[];
  teams: Team[];
}) {
  const status = season.isActive
    ? `Week ${season.currentWeek} of ${season.totalWeeks}`
    : "Season complete";

  return (
    <div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-14">
      <div>
        <p className="kicker">{season.shortName} · {status}</p>
        <h2 className="mt-3 text-[length:var(--wg-text-display)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
          The Gym Newbie League
        </h2>
        <p className="mt-5 max-w-md text-lg text-muted">
          Our team tournament for players who want organised games without the
          pro-scene pressure. Captains draft balanced rosters, every week you
          play a solo best-of-three against someone at your level, and your
          team, captain and coaches have your back the whole season.
        </p>
        <p className="mt-3 max-w-md text-sm text-muted">
          Skill level doesn&apos;t matter — everyone who signs up gets drafted.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href="/gnl/schedule" variant="outline">
            Schedule
          </ButtonLink>
          <ButtonLink href="/gnl/standings" variant="outline">
            Standings
          </ButtonLink>
          <ButtonLink href="/gnl/about" variant="outline">
            How it works
          </ButtonLink>
        </div>
        {!season.isActive ? (
          <div className="mt-4">
            <ButtonLink href={DISCORD_URL} variant="discord">
              <DiscordIcon size={18} /> Sign up on Discord
            </ButtonLink>
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="panel p-3 sm:p-4">
          <StandingsTable rows={rows} compact />
        </div>
      </div>
      </div>

      <div className="mt-12 flex justify-center">
        <TeamMedallions teams={teams} />
      </div>
    </div>
  );
}
