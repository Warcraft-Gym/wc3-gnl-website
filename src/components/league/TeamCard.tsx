import { SeasonLink as Link } from "./SeasonLink";
import { ArrowUpRight, Crown } from "lucide-react";
import type { StandingRow, Team } from "@/lib/api/types";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { TeamPlate } from "./VsBadge";
import { Flag } from "@/components/ui/Flag";
import { record } from "@/lib/figures.mjs";
import { cn, raceOf, RACES, type Race } from "@/lib/utils";

const RACE_ORDER: Race[] = ["human", "orc", "nightelf", "undead", "random"];

/** Team card for the teams index: standing, record, captains, race make-up
 *  and the full roster sorted by MMR. */
export function TeamCard({ team, standing }: { team: Team; standing?: StandingRow }) {
  const rated = team.players.filter((p) => p.mmr);
  const avgMmr = rated.length ? Math.round(rated.reduce((n, p) => n + (p.mmr ?? 0), 0) / rated.length) : undefined;
  // Captains are listed under the team name; the roster is players only,
  // strongest first, with playing captains marked by the crown.
  const roster = [...team.players].sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0));
  const races = RACE_ORDER.map((r) => ({ race: r, n: team.players.filter((p) => raceOf(p.race) === r).length })).filter((x) => x.n);
  const makeup = races.map((x) => `${x.n} ${RACES[x.race].label}`).join(", ");

  return (
    <Surface interactive as="article" className="group flex flex-col p-5">
      {/* The plate and the name link to the team; the captains link to their
          own pages, so the header is not one big anchor (anchors cannot nest). */}
      <div className="flex items-start gap-3">
        <Link href={`/gnl/teams/${team.slug}`} className="shrink-0" aria-label={team.name}>
          <TeamPlate tag={team.tag!} logoUrl={team.logoUrl} name={team.name} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold uppercase leading-tight text-fg">
            <Link
              href={`/gnl/teams/${team.slug}`}
              className="flex items-start justify-between gap-2 transition-colors group-hover:text-gold"
            >
              <span className="min-w-0">{team.name}</span>
              <ArrowUpRight size={18} className="shrink-0 text-faint transition-colors group-hover:text-gold" />
            </Link>
          </h3>
          {team.captains.length ? (
            <ul className="mt-1.5 space-y-1">
              {team.captains.map((c) => (
                <li key={c.id} className="flex items-center gap-1.5 text-xs text-muted">
                  <Crown size={12} className="shrink-0 text-gold" />
                  <RaceBadge race={raceOf(c.race)} showLabel={false} />
                  <Flag code={c.country} className="shrink-0" />
                  <Link href={`/gnl/players/${c.slug}`} className="truncate text-fg transition-colors hover:text-gold">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Standing + numbers */}
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-4">
        <div>
          <dt className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">Standing</dt>
          <dd className="tnum mt-0.5 font-display text-base font-bold text-fg">
            {standing ? (
              <>
                <span className={standing.rank === 1 ? "text-gold" : ""}>#{standing.rank}</span>
                <span className="ml-1.5 font-sans text-xs font-normal text-muted">{standing.points} pts</span>
              </>
            ) : (
              "-"
            )}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">Series record</dt>
          <dd className="tnum mt-0.5 font-display text-base font-bold text-fg">
            {(standing ? record(standing.wins, standing.losses, standing.draws) : null) ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">Avg MMR</dt>
          <dd className="tnum mt-0.5 font-display text-base font-bold text-fg">{avgMmr ?? "-"}</dd>
        </div>
      </dl>

      {/* Race make-up */}
      {races.length ? (
        <div className="mt-3">
          <div
            role="img"
            aria-label={`Race make-up of ${team.players.length} players: ${makeup}`}
            className="flex h-1.5 w-full gap-0.5"
          >
            {races.map((x) => (
              <span key={x.race} className={cn("h-full rounded-sm", RACES[x.race].dot)} style={{ width: `${(x.n / team.players.length) * 100}%` }} />
            ))}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[0.6rem] uppercase tracking-wide text-faint">
            {races.map((x) => (
              <span key={x.race}>
                {x.n} {RACES[x.race].label}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      {/* Roster, strongest first */}
      <ul className="mt-4 grid gap-x-6 gap-y-1.5 border-t border-line/60 pt-4 sm:grid-cols-2">
        {roster.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 text-muted">
              <RaceBadge race={raceOf(p.race)} showLabel={false} />
              <Flag code={p.country} className="shrink-0 text-xs" />
              <Link href={`/gnl/players/${p.slug}`} className={cn("truncate transition-colors hover:text-gold", p.isCaptain && "text-fg")}>
                {p.name}
              </Link>
              {p.isCaptain ? <Crown size={11} className="shrink-0 text-gold" /> : null}
            </span>
            <span className="tnum shrink-0 font-mono text-[0.68rem] text-faint" title="W3Champions MMR">
              {p.mmr ?? "-"}
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
