import Link from "next/link";
import { ArrowUpRight, Crown } from "lucide-react";
import type { StandingRow, Team } from "@/lib/api/types";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { TeamPlate } from "./VsBadge";
import { cn, raceOf, type Race } from "@/lib/utils";

const RACE_ORDER: Race[] = ["human", "orc", "nightelf", "undead", "random"];
const RACE_BG: Record<Race, string> = {
  human: "bg-human",
  orc: "bg-orc",
  nightelf: "bg-nightelf",
  undead: "bg-undead",
  random: "bg-faint",
};
const RACE_LABEL: Record<Race, string> = { human: "Human", orc: "Orc", nightelf: "Night Elf", undead: "Undead", random: "Random" };

/** Team card for the teams index: standing, record, captains, race make-up
 *  and the full roster sorted by MMR. */
export function TeamCard({ team, standing }: { team: Team; standing?: StandingRow }) {
  const rated = team.players.filter((p) => p.mmr);
  const avgMmr = rated.length ? Math.round(rated.reduce((n, p) => n + (p.mmr ?? 0), 0) / rated.length) : undefined;
  // Captains lead the list (whether or not they play), then the roster by MMR.
  const playingCaptainIds = new Set(team.players.filter((p) => p.isCaptain).map((p) => p.id));
  const nonPlayingCaptains = team.captains.filter((c) => !playingCaptainIds.has(c.id));
  const roster = [...team.players].sort(
    (a, b) => Number(b.isCaptain) - Number(a.isCaptain) || (b.mmr ?? 0) - (a.mmr ?? 0),
  );
  const races = RACE_ORDER.map((r) => ({ race: r, n: team.players.filter((p) => raceOf(p.race) === r).length })).filter((x) => x.n);

  return (
    <Surface interactive as="article" className="group flex flex-col p-5">
      <Link href={`/gnl/teams/${team.slug}`} className="flex items-start gap-3">
        <TeamPlate tag={team.tag!} logoUrl={team.logoUrl} name={team.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-start justify-between gap-2 font-display text-lg font-bold uppercase leading-tight text-fg transition-colors group-hover:text-gold">
            <span className="min-w-0">{team.name}</span>
            <ArrowUpRight size={18} className="shrink-0 text-faint transition-colors group-hover:text-gold" />
          </h3>
          {team.captains.length ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Crown size={12} className="shrink-0 text-gold" />
              <span className="truncate">{team.captains.map((c) => c.name).join(" & ")}</span>
            </p>
          ) : null}
        </div>
      </Link>

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
          <dt className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">Record</dt>
          <dd className="tnum mt-0.5 font-display text-base font-bold">
            {standing ? (
              <>
                <span className="text-win">{standing.wins}</span>
                <span className="text-faint">-</span>
                <span className="text-muted">{standing.draws}</span>
                <span className="text-faint">-</span>
                <span className="text-loss">{standing.losses}</span>
              </>
            ) : (
              "-"
            )}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">Avg MMR</dt>
          <dd className="tnum mt-0.5 font-display text-base font-bold text-fg">{avgMmr ?? "-"}</dd>
        </div>
      </dl>

      {/* Race make-up */}
      {races.length ? (
        <div className="mt-3" title={races.map((x) => `${x.n} ${RACE_LABEL[x.race]}`).join(", ")}>
          <div className="flex h-1.5 w-full gap-px overflow-hidden rounded">
            {races.map((x) => (
              <span key={x.race} className={cn("h-full", RACE_BG[x.race])} style={{ width: `${(x.n / team.players.length) * 100}%` }} />
            ))}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[0.6rem] uppercase tracking-wide text-faint">
            {races.map((x) => (
              <span key={x.race}>
                {x.n} {RACE_LABEL[x.race]}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      {/* Captains first, then the roster strongest first */}
      <ul className="mt-4 flex flex-col gap-1.5 border-t border-line/60 pt-4">
        {nonPlayingCaptains.map((c) => (
          <li key={`captain-${c.id}`} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-fg">
              <RaceBadge race={raceOf(c.race)} showLabel={false} />
              <span className="truncate">{c.name}</span>
              <Crown size={11} className="shrink-0 text-gold" />
            </span>
            <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-wide text-faint">Captain</span>
          </li>
        ))}
        {roster.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-muted">
              <RaceBadge race={raceOf(p.race)} showLabel={false} />
              <Link href={`/gnl/players/${p.slug}`} className={cn("truncate transition-colors hover:text-gold", p.isCaptain && "text-fg")}>
                {p.name}
              </Link>
              {p.isCaptain ? <Crown size={11} className="shrink-0 text-gold" /> : null}
            </span>
            <span className="tnum shrink-0 text-xs text-faint" title="W3Champions MMR">
              {p.mmr ?? "-"}
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
