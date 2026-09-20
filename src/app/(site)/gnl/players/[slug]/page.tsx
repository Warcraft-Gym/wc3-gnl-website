import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tv } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { KeyArt } from "@/components/ui/KeyArt";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { TeamPlate } from "@/components/league/VsBadge";
import { CaptainBadge } from "@/components/league/CaptainBadge";
import { getPlayerProfile } from "@/lib/api/gnl";
import { getW3cProfile } from "@/lib/w3c";
import { MmrChart, type MmrLine } from "@/components/league/MmrChart";
import { RaceMmrChips } from "@/components/league/RaceMmrChips";
import { Meter } from "@/components/ui/Meter";
import { GameIcon } from "@/components/builds/GameIcon";
import { Flag } from "@/components/ui/Flag";
import { W3cMark } from "@/components/ui/W3cMark";
import { W3C_HEROES } from "@/lib/w3c-heroes";
import type { VsRaceRecord } from "@/lib/w3c";
import { record, resultLabel } from "@/lib/figures.mjs";
import { mainRace } from "@/lib/races.mjs";
import { cn, raceOf, RACES } from "@/lib/utils";
import type { MatchStatus, PlayerSeries } from "@/lib/api/types";

type Params = { params: Promise<{ slug: string }> };

const DASH = "—";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPlayerProfile(slug);
  if (!profile) return { title: "Player" };
  const { player, team } = profile;
  return {
    title: `${player.name}, GNL player`,
    description: `${player.name} (${RACES[player.race].label}${team ? `, ${team.name}` : ""}) in the Gym Newbie League: record and series in every season, W3Champions MMR and career stats.`,
    alternates: { canonical: `/gnl/players/${slug}` },
  };
}

/** One headline number in the masthead block. */
function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="bg-bg/85 px-4 py-3 sm:px-5 sm:py-4">
      <dt className="whitespace-nowrap font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">{label}</dt>
      <dd className={cn("tnum mt-1 font-display text-2xl font-bold leading-none", tone ?? "text-fg")}>{value}</dd>
    </div>
  );
}

const STATUS_LABEL: Record<MatchStatus, string> = { scheduled: "Scheduled", live: "Live", completed: "Final" };

/** "GNL 17 and GNL 18", "GNL 16, GNL 17 and GNL 18". */
function listSeasons(names: string[]) {
  const asc = [...names].reverse();
  if (asc.length <= 1) return asc[0] ?? "";
  return `${asc.slice(0, -1).join(", ")} and ${asc[asc.length - 1]}`;
}

/** One of the player's series, from their side. */
function SeriesRow({ s }: { s: PlayerSeries }) {
  const won = s.status === "completed" && s.score > s.opponentScore;
  const lost = s.status === "completed" && s.score < s.opponentScore;
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 p-4">
      <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-faint">
        Week {s.week}
        <span className="mt-0.5 block">{STATUS_LABEL[s.status]}</span>
      </div>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <RaceIcon race={s.race} size={22} />
          <span className="text-faint">vs</span>
          <RaceIcon race={s.opponent.race} size={22} />
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
      <div
        title={s.status === "scheduled" ? undefined : resultLabel(s.score, s.opponentScore)}
        aria-label={s.status === "scheduled" ? undefined : resultLabel(s.score, s.opponentScore)}
        className={cn("tnum font-display text-lg font-bold", won ? "text-win" : lost ? "text-loss" : "text-faint")}
      >
        {s.status === "scheduled" ? DASH : `${s.score} : ${s.opponentScore}`}
      </div>
    </div>
  );
}
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
      <p className="tnum mt-3 font-display text-3xl font-bold text-fg">{record(wins, losses) ?? DASH}</p>
      {rows.length ? (
        <ul className="mt-4 space-y-2">
          {rows.map(({ race, rec }) => (
            <li key={race} className="grid grid-cols-[7rem_minmax(0,1fr)_5rem] items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <RaceIcon race={race} size={18} /> vs {RACES[race].label}
              </span>
              <Meter
                value={rec!.wins}
                max={rec!.wins + rec!.losses}
                label={`Won ${rec!.wins} of ${rec!.wins + rec!.losses} against ${RACES[race].label}`}
              />
              <span className="tnum text-right text-muted">{record(rec!.wins, rec!.losses) ?? DASH}</span>
            </li>
          ))}
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
  const profile = await getPlayerProfile(slug);
  if (!profile) notFound();
  const { player, team, isCaptain, captainOnly, latestSeason, history, allTime, w3c, career } = profile;
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
  // One definition of the main race for the masthead art, the large icon, the
  // bold chip, the headline MMR tile and the first line of the chart.
  const main = mainRace(ladder, player.race);
  const mainLadder = ladder.find((r) => r.race === main);
  const mmrLines: MmrLine[] = (live?.timelines ?? []).map((t) => ({
    race: t.race,
    mmr: ladder.find((r) => r.race === t.race)?.mmr ?? 0,
    points: t.points,
  }));
  const ladderGames = ladder.reduce((n, r) => n + r.games, 0);
  const ladderWins = ladder.reduce((n, r) => n + r.wins, 0);
  const ladderLosses = ladder.reduce((n, r) => n + r.losses, 0);
  // GNL series per opponent race, from every completed series on record.
  const gnlVsRace: VsRaceRecord = {};
  for (const sr of history.flatMap((h) => h.series)) {
    if (sr.status !== "completed") continue;
    const rec = (gnlVsRace[sr.opponent.race] ??= { wins: 0, losses: 0 });
    if (sr.score > sr.opponentScore) rec.wins++;
    else if (sr.score < sr.opponentScore) rec.losses++;
  }
  const seasonsPlayed = history.filter((h) => h.record.games > 0 || h.series.length > 0);
  const seasonsLabel = listSeasons(seasonsPlayed.map((h) => h.season.shortName));
  const hasGnlGames = allTime.games > 0;
  // "GNL 17 series" when there is one season on record, else the total.
  const gnlSeriesLabel = seasonsPlayed.length > 1 ? "GNL series" : `${seasonsPlayed[0]?.season.shortName ?? latestSeason.shortName} series`;

  return (
    <>
      {/* Masthead: the player's race showcase runs under the nav bar; Random
          players get the shared scene since there is no Random art */}
      <div className="keyart -mt-[var(--wg-chrome-h,var(--wg-header-h))]">
        <KeyArt
          src={main === "random" ? "/keyart/feature-orc-vs-human.webp" : `/factions/headers/${main}.webp`}
          position="center 30%"
          overlay="soft"
          priority
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(0,0,0,.8)_0%,rgba(0,0,0,.55)_45%,rgba(0,0,0,.15)_100%)]"
        />
        <Container className="relative z-10 pb-12 pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+2.5rem)] sm:pb-14 sm:pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+3rem)]">
          <Link
            href={team ? `/gnl/teams/${team.slug}` : "/gnl/teams"}
            className="mb-5 inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> {team ? team.name : "Teams"}
          </Link>

          {/* Identity on the left, the headline numbers as a block on the right */}
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="flex min-w-0 items-center gap-5 sm:gap-6">
              <span className="relative shrink-0">
                <span aria-hidden className="absolute inset-[-20%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-60 blur-xl" />
                <RaceIcon race={main} size={88} className="relative drop-shadow-[0_10px_20px_rgba(0,0,0,.9)]" />
              </span>
              <div className="min-w-0">
                <p className="kicker">
                  {captainOnly ? `${latestSeason.shortName} captain` : `${latestSeason.shortName} player`}
                  {history.length > 1 ? ` · ${history.length} seasons` : ""}
                </p>
                <h1
                  className={cn(
                    "mt-1 flex flex-wrap items-center gap-3 font-extrabold leading-none [overflow-wrap:anywhere] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]",
                    // Long single-word names step down a size so the stats block keeps its place beside them
                    player.name.length >= 9 ? "text-[length:clamp(1.75rem,0.8rem+2.6vw,2.8rem)]" : "text-[length:var(--wg-text-display)]",
                  )}
                >
                  {player.name}
                  {isCaptain && !captainOnly ? <CaptainBadge /> : null}
                </h1>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
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
                    <a href={w3cUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-gold hover:underline">
                      <W3cMark size={14} /> {player.battleTag}
                    </a>
                  ) : null}
                </p>
                {/* One chip per ladder race, so no surface reduces the player
                    to one MMR without naming its race. */}
                <div className="mt-4">
                  <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
                    <W3cMark size={11} className="opacity-70" /> Ladder season {ladderSeason}
                  </p>
                  <RaceMmrChips races={ladder} main={main} />
                </div>
              </div>
            </div>

            <dl className={cn("panel grid shrink-0 gap-px overflow-hidden bg-line/60", hasGnlGames ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2")}>
              {hasGnlGames ? (
                <Stat label={`${gnlSeriesLabel} record`} value={record(allTime.wins, allTime.losses) ?? DASH} />
              ) : null}
              <Stat
                label={mainLadder ? `W3C MMR · ${RACES[main].label}` : "W3C MMR"}
                value={mainLadder?.mmr ?? player.mmr ?? DASH}
                tone="text-gold"
              />
              <Stat
                label={mainLadder ? "Ladder games" : "Career rating"}
                value={mainLadder ? ladderGames : career?.rating ?? DASH}
              />
            </dl>
          </div>
        </Container>
        <div className="rivets relative z-10" aria-hidden />
      </div>

      <Container className="py-10">
        {captainOnly ? (
          <p className="mb-6 border-l-2 border-gold/60 pl-4 text-sm text-muted">
            Captains {team?.name ?? "the team"} in {latestSeason.shortName} without playing in the roster.
            {hasGnlGames ? " The league numbers below come from the seasons they played." : " The numbers below are their own ladder and career."}
          </p>
        ) : null}

        {/* GNL vs ladder, side by side */}
        {hasGnlGames || (!captainOnly && live) ? (
          <section>
            <h2 className="mb-4 font-display text-xl font-bold uppercase">League vs ladder</h2>
            <p className="mb-4 max-w-2xl text-sm text-muted">
              Every GNL series on record against the current W3Champions ladder season, and how they go against each race.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <Compare
                title={gnlSeriesLabel}
                games={allTime.games}
                wins={allTime.wins}
                losses={allTime.losses}
                vs={gnlVsRace}
                note={seasonsPlayed.length > 1 ? `Best-of-three series across ${seasonsLabel}` : "Best-of-three series in the league"}
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
            {history.length ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">GNL seasons</h2>
                <Surface className="divide-y divide-line/60">
                  {history.map((h) => {
                    const played = h.record.games > 0;
                    return (
                      <div key={h.season.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 p-4">
                        <span className="font-display text-sm font-extrabold uppercase text-gold">{h.season.shortName}</span>
                        <span className="min-w-0">
                          <Link href={`/gnl/teams/${h.team.slug}?season=${h.season.number}`} className="flex items-center gap-2 text-sm text-fg hover:text-gold">
                            <TeamPlate tag={h.team.tag!} logoUrl={h.team.logoUrl} name={h.team.name} size="sm" />
                            <span className="truncate font-display font-bold uppercase">{h.team.name}</span>
                            {h.isCaptain ? <CaptainBadge compact /> : null}
                          </Link>
                          <span className="mt-0.5 block text-xs text-faint">
                            {h.captainOnly ? "Captain, not in the roster" : played ? `${h.record.games} games` : "No games played"}
                            {h.record.matchupHistory.length ? (
                              <span className="ml-2 inline-flex items-center gap-0.5 align-middle" title="Opponent race of each game">
                                {h.record.matchupHistory.map((r, i) => (
                                  <RaceIcon key={`${r}-${i}`} race={r} size={14} />
                                ))}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className={cn("tnum text-right font-display text-lg font-bold", played ? "text-fg" : "text-faint")}>
                          {(played ? record(h.record.wins, h.record.losses) : null) ?? DASH}
                        </span>
                      </div>
                    );
                  })}
                </Surface>
                {career && career.seasonsPlayed > history.length ? (
                  <p className="mt-2 text-xs text-faint">
                    Season by season from the published events. Earlier seasons count in the career totals only.
                  </p>
                ) : null}
              </section>
            ) : null}

            {career && (career.seasonsPlayed > 0 || career.rating > 0) ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">GNL career</h2>
                <Surface className="grid grid-cols-2 divide-x divide-y divide-line/60 sm:grid-cols-4">
                  {[
                    ["Seasons", career.seasonsPlayed],
                    ["Rating", career.rating],
                    ["Series record", record(career.seriesWon, career.seriesLost) ?? DASH],
                    ["Game record", record(career.gamesWon, career.gamesLost) ?? DASH],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="p-4">
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">{k}</p>
                      <p className="tnum mt-1 font-display text-lg font-bold text-fg">{v}</p>
                    </div>
                  ))}
                </Surface>
              </section>
            ) : null}

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
                          {record(r.wins, r.losses) ?? DASH} <span className="text-faint">·</span> {r.games} games
                        </span>
                      </span>
                      <span className="tnum font-display text-lg font-bold text-gold">{r.mmr}</span>
                    </div>
                  ))}
                </Surface>
                {mmrLines.length ? (
                  <div className="mt-4">
                    <MmrChart lines={mmrLines} main={main} />
                  </div>
                ) : null}
                <p className="mt-2 flex items-center gap-1.5 text-xs text-faint">
                  <W3cMark size={12} className="opacity-70" /> Ladder season {ladderSeason}, {live ? "live from W3Champions" : "synced from W3Champions"}.
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

          </div>

          <div className="space-y-10">
            {history.some((h) => h.series.length) ? (
              <section>
                <h2 className="mb-4 font-display text-xl font-bold uppercase">Series</h2>
                <div className="space-y-4">
                  {history
                    .filter((h) => h.series.length)
                    .map((h) => (
                      <div key={h.season.id}>
                        <p className="mb-2 flex items-baseline gap-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-faint">
                          <span className="font-display text-sm font-extrabold text-gold">{h.season.shortName}</span>
                          <Link href={`/gnl/teams/${h.team.slug}?season=${h.season.number}`} className="transition-colors hover:text-gold">{h.team.name}</Link>
                          <span className="tnum ml-auto">{record(h.record.wins, h.record.losses) ?? DASH}</span>
                        </p>
                        <Surface className="divide-y divide-line/60">
                          {h.series.map((s) => (
                            <SeriesRow key={s.id} s={s} />
                          ))}
                        </Surface>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}

            {live?.matches.length ? (
              <section>
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-xl font-bold uppercase">Recent ladder games</h2>
                  <a href={live.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted hover:text-gold">
                    <W3cMark size={13} /> All games on W3Champions
                  </a>
                </div>
                <Surface className="divide-y divide-line/60">
                  {live.matches.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className={cn("w-9 shrink-0 font-display text-[0.65rem] font-extrabold", m.won ? "text-win" : "text-loss")}>
                        {m.won ? "WIN" : "LOSS"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <RaceIcon race={m.race} size={20} />
                          <span className="text-faint">vs</span>
                          <RaceIcon race={m.opponent.race} size={20} />
                          <a
                            href={`https://w3champions.com/player/${encodeURIComponent(m.opponent.battleTag)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-w-0 items-center gap-1 truncate text-fg hover:text-gold"
                          >
                            {m.opponent.name} <W3cMark size={11} className="opacity-70" />
                          </a>
                          <span className="tnum text-xs text-faint">{m.opponent.mmr}</span>
                        </span>
                        <a
                          href={`https://w3champions.com/match/${m.id}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open this game on W3Champions"
                          className="block truncate text-xs text-faint transition-colors hover:text-gold"
                        >
                          {m.map} <span>·</span> {dur(m.durationSeconds)} <span>·</span> {fmtDate.format(new Date(m.startedAt))}
                          <W3cMark size={10} className="ml-1 opacity-70" />
                        </a>
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
