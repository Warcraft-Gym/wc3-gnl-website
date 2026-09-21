import { Swords, GraduationCap, Users2, Trophy } from "lucide-react";
import type { Season, Team } from "@/lib/api/types";
import { TeamMedallions } from "@/components/home/TeamMedallions";
import { ButtonLink } from "@/components/ui/Button";

const PILLARS = [
  {
    Icon: Users2,
    title: "Everyone gets drafted",
    body: "Sign up, get picked by a captain, and play the season with a team behind you. Skill level does not matter.",
  },
  {
    Icon: Swords,
    title: "One series a week",
    body: "A solo best-of-three against someone at your level. No pro-scene pressure, real competition.",
  },
  {
    Icon: GraduationCap,
    title: "Captains and coaches",
    body: "Replay reviews, strategy talk and a private team channel. You are never grinding alone.",
  },
  {
    Icon: Trophy,
    title: "Ladder and fantasy on the side",
    body: "Your W3Champions games earn points and achievements for your team, and everyone can run a fantasy squad.",
  },
];

/** The league as a pitch: what it is, why to join, the crests, and the way
 *  in. Standings and schedules live on the GNL pages themselves. */
export function GnlSection({ season, teams }: { season: Season; teams: Team[] }) {
  const status = season.isActive
    ? `${season.shortName} in progress, week ${season.currentWeek} of ${season.totalWeeks}`
    : `${season.shortName} complete, next season soon`;

  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <p className="kicker justify-center">{status}</p>
        <h2 className="mt-3 text-[length:var(--wg-text-display)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
          The Gym Newbie League
        </h2>
        <p className="mt-5 text-lg text-muted">
          Our team tournament for players who want organised games without the pro-scene
          pressure. Captains draft balanced rosters, every week you play a solo
          best-of-three against someone at your level, and your team, captain and coaches
          have your back the whole season.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map(({ Icon, title, body }) => (
          <div key={title} className="panel p-5">
            <span className="skew grid size-10 place-items-center bg-gold/10 text-gold">
              <Icon size={18} className="[transform:skewX(calc(var(--wg-skew)*-1))]" />
            </span>
            <h3 className="mt-4 font-display text-[0.95rem] font-bold uppercase text-fg">{title}</h3>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <TeamMedallions teams={teams} />
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/gnl/about" size="lg">
          About the league
        </ButtonLink>
        <ButtonLink href="/gnl/schedule" size="lg">
          Follow {season.shortName}
        </ButtonLink>
      </div>
    </div>
  );
}
