import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Tv } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { KeyArt } from "@/components/ui/KeyArt";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { TeamPlate } from "@/components/league/VsBadge";
import { CaptainBadge } from "@/components/league/CaptainBadge";
import { getActiveSeason, getPlayerProfile } from "@/lib/api/gnl";
import { getW3cProfile } from "@/lib/w3c";
import { MmrChart } from "@/components/league/MmrChart";
import { GameIcon } from "@/components/builds/GameIcon";
import { Flag } from "@/components/ui/Flag";
import { W3C_HEROES } from "@/lib/w3c-heroes";
import type { VsRaceRecord } from "@/lib/w3c";
import { cn, raceOf } from "@/lib/utils";
import type { MatchStatus } from "@/lib/api/types";

type Params = { params: Promise<{ slug: string }> };

const RACE_LABEL: Record<string, string> = { human: "Human", orc: "Orc", nightelf: "Night Elf", undead: "Undead", random: "Random" };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPlayerProfile(slug);
  if (!profile) return { title: "Player" };
  const { player, team } = profile;
  return {
    title: `${player.name}, GNL player`,
    description: `${player.name} (${RACE_LABEL[player.race]}${team ? `, ${team.name}` : ""}) in the Gym Newbie League: season record, W3Champions MMR, career stats and series.`,
    alternates: { canonical: `/gnl/players/${slug}` },
  };
}

function pct(w: number, l: number) {
  const n = w + l;
  return n ? Math.round((w * 100) / n) : 0;
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="panel p-4">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className={cn("tnum mt-1 font-display text-2xl font-bold", tone ?? "text-fg")}>{value}</p>
    </div>
  );
}

const STATUS_LABEL: Record<MatchStatus, string> = { scheduled: "Scheduled", live: "Live", completed: "Final" };
const RACE_ORDER = ["human", "orc", "nightelf", "undead", "random"] as const;

/** One side of the league-vs-ladder comparison. */
function Compare({
  title,
  games,
  wins,
  losses,
  vs,
  note,
}: {
  title: string;
  games: number;
  wins: number;
  losses: number;
  vs: VsRaceRecord;
  note: string;
}) {
  const rows = RACE_ORDER.map((r) => ({ race: r, rec: vs[r] })).filter((x) => x.rec && x.rec.wins + x.rec.losses > 0);
  return (
    <Surface className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[0.85rem] font-bold uppercase tracking-[0.08em] text-fg">{title}</h3>
        <span className="tnum text-xs text-faint">{games} games</span>
      </div>
      <p className="tnum mt-3 font-display text-3xl font-bold">
        <span className="text-win">{wins}</span>
        <span className="text-faint"> - </span>
        <span className="text-loss">{losses}</span>
        <span className={cn("ml-3 text-base", pct(wins, losses) >= 50 ? "text-win" : "text-loss")}>{games ? `${pct(wins, losses)}%` : ""}</span>
      </p>
      {rows.length ? (
        <ul className="mt-4 space-y-2">
          {rows.map(({ race, rec }) => {
            const total = rec!.wins + rec!.losses;
            const share = (rec!.wins / total) * 100;
            return (
              <li key={race} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted">
                  <RaceIcon race={race} size={14} /> vs {RACE_LABEL[race]}
                </span>
                <span className="flex h-1.5 overflow-hidden rounded bg-loss/25">
                  <span className="h-full bg-win/80" style={{ width: `${share}%` }} />
                </span>
                <span className="tnum text-right text-muted">
                  <span className="text-win">{rec!.wins}</span>
                  <span className="text-faint">-</span>
                  <span className="text-loss">{rec!.losses}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-faint">No games yet.</p>
      )}
      <p className="mt-4 text-[0.68rem] text-faint">{note}</p>
    </Surface>
  );
}

export default async function PlayerPage({ params }: Params) {
  const { slug } = await params;
  const [profile, season] = await Promise.all([getPlayerProfile(slug), getActiveSeason()]);
  if (!profile) notFound();
  const { player, team, isCaptain, captainOnly, season: rec, w3c, career, series } = profile;
  const live = player.battleTag ? await getW3cProfile(player.battleTag) : null;
  const w3cUrl = live?.profileUrl ?? (player.battleTag
    ? `https://w3champions.com/player/${encodeURIComponent(player.battleTag)}`
    : undefined);
  const ladder = live?.ladder.length
    ? live.ladder
    : w3c.map((r) => ({ race: r.race, mmr: r.mmr, league: "", division: 0, rank: 0, games: r.games, wins: r.wins, losses: r.losses }));
  const ladderSeason = live?.season ?? w3c[0]?.season;
  const fmtDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const dur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  // The player's main ladder race is the one with the most games; the headline
  // MMR and win rate come from it so they agree with the ladder table.
  const mainLadder = ladder[0];
  const ladderGames = ladder.reduce((n, r) => n + r.games, 0);
  const ladderWins = ladder.reduce((n, r) => n + r.wins, 0);
  const ladderLosses = ladder.reduce((n, r) => n + r.losses, 0);
  // GNL series per opponent race, from this season's completed series.
  const gnlVsRace: VsRaceRecord = {};
  for (const sr of series) {
    if (sr.status !== "completed") continue;
    const rec = (gnlVsRace[sr.opponent.race] ??= { wins: 0, losses: 0 });
    if (sr.score > sr.opponentScore) rec.wins++;
    else if (sr.score < sr.opponentScore) rec.losses++;
  }

  return (
    <>
      {/* Masthead: the player's race showcase runs under the nav bar; Random
          players get the shared scene since there is no Random art */}
      <div className="keyart -mt-[var(--wg-chrome-h,var(--wg-header-h))]">
        <KeyArt
          src={player.race === "random" ? "/keyart/feature-orc-vs-human.webp" : `/factions/headers/${player.race}.webp`}
          position="center 30%"
          overlay="soft"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(0,0,0,.8)_0%,rgba(0,0,0,.55)_45%,rgba(0,0,0,.15)_100%)]"
        />
        <Container className="relative z-10 pb-12 pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+2.5rem)] sm:pb-16 sm:pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+3.5rem)]">
          <Link
            href={team ? `/gnl/teams/${team.slug}` : "/gnl/teams"}
            className="mb-6 inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> {team ? team.name : "Teams"}
          </Link>
          <div className="flex flex-wrap items-center gap-5">
            <RaceIcon race={player.race} size={64} />
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-3 text-[length:var(--wg-text-display)] font-extrabold [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
                {player.name}
                {isCaptain ? <CaptainBadge /> : null}
              </h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <RaceBadge race={raceOf(player.race)} />
                {team ? (
                  <Link href={`/gnl/teams/${team.slug}`} className="inline-flex items-center gap-2 hover:text-gold">
                    <TeamPlate tag={team.tag!} logoUrl={team.logoUrl} name={team.name} size="sm" />
                    {team.name}
                  </Link>
                ) : null}
                {player.country ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Flag code={player.country} /> {player.country}
                  </span>
                ) : null}
                {w3cUrl ? (
                  <a href={w3cUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline">
                    {player.battleTag} <ExternalLink size={11} />
                  </a>
                ) : null}
              </p>
            </div>
          </div>
        </Container>
        <div className="rivets relative z-10" aria-hidden />
      </div>

      <Container className="py-10">
        {captainOnly ? (
          <p className="mb-6 border-l-2 border-gold/60 pl-4 text-sm text-muted">
            Captains {team?.name ?? "the team"} this season without playing in the roster. The numbers below are their own ladder and career.
          </p>
        ) : null}

        {/* Headline numbers */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {captainOnly ? null : (
            <>
              <Stat label={`${season.shortName} series`} value={<>{rec.wins}<span className="text-faint"> - </span>{rec.losses}</>} />
              <Stat label={`${season.shortName} win rate`} value={`${pct(rec.wins, rec.losses)}%`} tone={pct(rec.wins, rec.losses) >= 50 ? "text-win" : "text-loss"} />
            </>
          )}
          <Stat
            label={mainLadder ? `W3C MMR, ${RACE_LABEL[mainLadder.race]}` : "W3C MMR"}
            value={mainLadder?.mmr ?? player.mmr ?? "-"}
            tone="text-gold"
          />
          <Stat
            label={mainLadder ? "Ladder win rate" : "Career rating"}
            value={mainLadder ? `${pct(mainLadder.wins, mainLadder.losses)}%` : career?.rating ?? "-"}
            tone={mainLadder ? (pct(mainLadder.wins, mainLadder.losses) >= 50 ? "text-win" : "text-loss") : undefined}
          />
        </section>

        {/* GNL vs ladder, side by side */}
        {!captainOnly && (rec.games > 0 || live) ? (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-xl font-bold uppercase">League vs ladder</h2>
            <p className="mb-4 max-w-2xl text-sm text-muted">
              {season.shortName} series against the current W3Champions ladder season, and how they go against each race.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <Compare
                title={`${season.shortName} series`}
                games={rec.games}
                wins={rec.wins}
                losses={rec.losses}
                vs={gnlVsRace}
                note="Best-of-three series in the league"
              />
              <Compare
                title={`Ladder season ${ladderSeason ?? ""}`}
                games={ladderGames}
                wins={ladderWins}
                losses={ladderLosses}
                vs={live?.vsRace ?? {}}
                note={live ? `Per-race split from the last ${live.sampleSize} games` : "Synced from W3Champions"}
              />
            </div>
          </section>
        ) : null}

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-10">
            {ladder.length ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">W3Champions ladder</h2>
                <Surface className="divide-y divide-line/60">
                  {ladder.map((r) => (
                    <div key={r.race} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                      <RaceBadge race={r.race} />
                      <span className="min-w-0 text-sm text-muted">
                        {r.league ? (
                          <span className="block truncate text-fg">
                            {r.league}
                            {r.division ? ` ${r.division}` : ""}
                            {r.rank ? <span className="text-faint"> · rank {r.rank}</span> : null}
                          </span>
                        ) : null}
                        <span className="tnum block text-xs">
                          {r.wins}W {r.losses}L <span className="text-faint">·</span> {pct(r.wins, r.losses)}% <span className="text-faint">·</span> {r.games} games
                        </span>
                      </span>
                      <span className="tnum font-display text-lg font-bold text-gold">{r.mmr}</span>
                    </div>
                  ))}
                </Surface>
                {live?.timeline.length ? (
                  <div className="mt-4">
                    <MmrChart points={live.timeline} />
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-faint">
                  Ladder season {ladderSeason}, {live ? "live from W3Champions" : "synced from W3Champions"}.
                </p>
              </section>
            ) : null}

            {live?.heroes.length ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">Heroes</h2>
                <div className="flex flex-wrap gap-2">
                  {live.heroes.map((h) => {
                    const meta = W3C_HEROES[h.id];
                    return (
                      <div key={h.id} className="panel flex items-center gap-2.5 py-2 pl-2 pr-3" title={`${meta?.label ?? h.id}, in ${h.games} of the last ${live.sampleSize} games`}>
                        {meta ? <GameIcon iconKey={meta.icon} size={32} /> : null}
                        <span>
                          <span className="block text-sm text-fg">{meta?.label ?? h.id}</span>
                          <span className="tnum block text-xs text-faint">{h.games} games</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {career && (career.seasonsPlayed > 0 || career.rating > 0) ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">GNL career</h2>
                <Surface className="grid grid-cols-2 divide-x divide-y divide-line/60 sm:grid-cols-3">
                  {[
                    ["Seasons", career.seasonsPlayed],
                    ["Rating", career.rating],
                    ["Series", `${career.seriesWon}-${career.seriesLost}`],
                    ["Series win %", `${pct(career.seriesWon, career.seriesLost)}%`],
                    ["Games", `${career.gamesWon}-${career.gamesLost}`],
                    ["Game win %", `${pct(career.gamesWon, career.gamesLost)}%`],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="p-4">
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">{k}</p>
                      <p className="tnum mt-1 font-display text-lg font-bold text-fg">{v}</p>
                    </div>
                  ))}
                </Surface>
              </section>
            ) : null}
          </div>

          <div className="space-y-10">
            {series.length ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">Series this season</h2>
                <Surface className="divide-y divide-line/60">
                  {series.map((s) => {
                    const won = s.status === "completed" && s.score > s.opponentScore;
                    const lost = s.status === "completed" && s.score < s.opponentScore;
                    return (
                      <div key={s.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 p-4">
                        <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-faint">
                          Week {s.week}
                          <span className="mt-0.5 block">{STATUS_LABEL[s.status]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm">
                            <RaceIcon race={s.race} size={16} />
                            <span className="text-faint">vs</span>
                            <RaceIcon race={s.opponent.race} size={16} />
                            <Link href={`/gnl/players/${s.opponent.slug}`} className="font-display font-bold uppercase text-fg hover:text-gold">
                              {s.opponent.name}
                            </Link>
                          </p>
                          <p className="mt-0.5 truncate text-xs text-faint">
                            {s.fixture.homeTeam} vs {s.fixture.awayTeam}
                          </p>
                        </div>
                        <div className="w-8">
                          {s.cast ? (
                            <a
                              href={s.cast.vodUrl ?? s.cast.channelUrl}
                              target="_blank"
                              rel="noreferrer"
                              title={s.cast.vodUrl ? `Watch the VOD on ${s.cast.name}` : `Cast by ${s.cast.name}`}
                              className={cn("grid size-7 place-items-center rounded border transition-colors", s.cast.vodUrl ? "border-arcane/60 bg-arcane/10 text-arcane" : "border-line text-muted hover:text-arcane")}
                            >
                              <Tv size={13} />
                            </a>
                          ) : null}
                        </div>
                        <div className={cn("tnum font-display text-lg font-bold", won ? "text-win" : lost ? "text-loss" : "text-faint")}>
                          {s.status === "scheduled" ? "-" : `${s.score} : ${s.opponentScore}`}
                        </div>
                      </div>
                    );
                  })}
                </Surface>
              </section>
            ) : null}

            {live?.matches.length ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">Recent ladder games</h2>
                <Surface className="divide-y divide-line/60">
                  {live.matches.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className={cn("w-9 shrink-0 font-display text-[0.65rem] font-extrabold", m.won ? "text-win" : "text-loss")}>
                        {m.won ? "WIN" : "LOSS"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <RaceIcon race={m.race} size={14} />
                          <span className="text-faint">vs</span>
                          <RaceIcon race={m.opponent.race} size={14} />
                          <a
                            href={`https://w3champions.com/player/${encodeURIComponent(m.opponent.battleTag)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-fg hover:text-gold"
                          >
                            {m.opponent.name}
                          </a>
                          <span className="tnum text-xs text-faint">{m.opponent.mmr}</span>
                        </span>
                        <span className="block truncate text-xs text-faint">
                          {m.map} <span>·</span> {dur(m.durationSeconds)} <span>·</span> {fmtDate.format(new Date(m.startedAt))}
                        </span>
                      </span>
                      <span className={cn("tnum w-9 shrink-0 text-right font-mono text-xs", m.mmrGain >= 0 ? "text-win" : "text-loss")}>
                        {m.mmrGain >= 0 ? "+" : ""}
                        {m.mmrGain}
                      </span>
                    </div>
                  ))}
                </Surface>
              </section>
            ) : null}
          </div>
        </div>
      </Container>
    </>
  );
}
