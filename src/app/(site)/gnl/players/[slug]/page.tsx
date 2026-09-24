import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tv } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { KeyArt } from "@/components/ui/KeyArt";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { TeamPlate } from "@/components/league/VsBadge";
import { CaptainBadge } from "@/components/league/CaptainBadge";
import { findPlayerBySlug, getPlayerProfile } from "@/lib/api/gnl";
import { parsePlayerParam, playerPath } from "@/lib/slug.mjs";
import { getW3cProfile } from "@/lib/w3c";
import { MmrChart, type MmrLine } from "@/components/league/MmrChart";
import { RaceMmrChips } from "@/components/league/RaceMmrChips";
import { GameIcon } from "@/components/builds/GameIcon";
import { Flag } from "@/components/ui/Flag";
import { W3cMark } from "@/components/ui/W3cMark";
import { W3C_HEROES } from "@/lib/w3c-heroes";
import type { VsRaceRecord } from "@/lib/w3c";
import { record, resultLabel, signed } from "@/lib/figures.mjs";
import { mainRace } from "@/lib/races.mjs";
import { cn, RACES } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, profilePageJsonLd } from "@/lib/seo";
import type { MatchStatus, PlayerSeries } from "@/lib/api/types";

type Params = { params: Promise<{ slug: string }> };

const DASH = "—";

/** The profile behind the param. An old name link or a stale name part
 *  redirects to `/{id}-{current name}`; an unknown player is a 404. */
async function loadProfile(param: string) {
  const { id, slug } = parsePlayerParam(param);
  if (id == null) {
    const hit = await findPlayerBySlug(slug);
    if (!hit) notFound();
    permanentRedirect(playerPath(hit.id, hit.name));
  }
  const profile = await getPlayerProfile(id);
  if (!profile) notFound();
  const path = playerPath(id, profile.player.name);
  if (path !== `/gnl/players/${param}`) permanentRedirect(path);
  return { profile, path };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { profile, path } = await loadProfile(slug);
  const { player, team } = profile;
  const about = [player.race ? RACES[player.race].label : null, team?.name].filter(Boolean).join(", ");
  return {
    title: `${player.name}, GNL player`,
    description: `${player.name}${about ? ` (${about})` : ""} in the Gym Newbie League: record and series in every season, W3Champions MMR and career stats.`,
    alternates: { canonical: path },
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
          <RaceIcon race={s.race} size={24} />
          <span className="text-faint">vs</span>
          <RaceIcon race={s.opponent.race} size={24} />
          <Link href={playerPath(s.opponent.id, s.opponent.name)} className="font-display font-bold uppercase text-fg hover:text-gold">
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
            <Tv size={15} />
          </a>
        ) : null}
      </div>
      <div
        role="img"
        title={s.status === "scheduled" ? undefined : resultLabel(s.score, s.opponentScore)}
        aria-label={s.status === "scheduled" ? "Not played yet" : resultLabel(s.score, s.opponentScore)}
        className={cn("tnum font-display text-lg font-bold", won ? "text-win" : lost ? "text-loss" : "text-faint")}
      >
        {s.status === "scheduled" ? DASH : `${s.score} : ${s.opponentScore}`}
      </div>
    </div>
  );
}
const RACE_ORDER = ["human", "orc", "nightelf", "undead", "random"] as const;

/** One side of the Gym Newbie League vs ladder comparison: a headline record
 *  under its unit word, then the same unit split by opponent race. A win rate
 *  gets no bar; the record carries the percent. */
function Compare({
  title,
  unit,
  wins,
  losses,
  vs,
  mark,
  note,
}: {
  title: string;
  /** What every figure in the panel counts: "Series" or "Ladder games". */
  unit: string;
  wins: number;
  losses: number;
  vs: VsRaceRecord;
  mark?: boolean;
  note?: string;
}) {
  const rows = RACE_ORDER.map((r) => ({ race: r, rec: vs[r] })).filter((x) => x.rec && x.rec.wins + x.rec.losses > 0);
  return (
    <Surface className="p-5">
      <h3 className="flex items-center gap-1.5 font-display text-[0.85rem] font-bold uppercase tracking-[0.08em] text-fg">
        {mark ? <W3cMark size={15} className="opacity-70" /> : null}
        {title}
      </h3>
      <p className="mt-3">
        <span className="block font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">{unit}</span>
        <span className="tnum mt-1 block font-display text-3xl font-bold leading-none text-fg">{record(wins, losses) ?? DASH}</span>
      </p>
      {rows.length ? (
        <>
          <p className="mt-5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">{unit} by opponent race</p>
          <ul className="mt-1 divide-y divide-line/50">
            {rows.map(({ race, rec }) => (
              <li key={race} className="flex items-center justify-between gap-4 py-1.5 text-xs">
                <span className="flex items-center gap-2 text-muted">
                  <RaceIcon race={race} size={20} /> vs {RACES[race].label}
                </span>
                <span className="tnum whitespace-nowrap text-right text-muted">{record(rec!.wins, rec!.losses) ?? DASH}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {note ? <p className="mt-4 text-[0.68rem] text-faint">{note}</p> : null}
    </Surface>
  );
}

export default async function PlayerPage({ params }: Params) {
  const { slug } = await params;
  const { profile, path } = await loadProfile(slug);
  const { player, team, isCaptain, captainOnly, latestSeason, history, allTime, w3c, career } = profile;
  const live = player.battleTag ? await getW3cProfile(player.battleTag) : null;
  const w3cUrl = live?.profileUrl ?? (player.battleTag
    ? `https://w3champions.com/player/${encodeURIComponent(player.battleTag)}`
    : undefined);
  // Every ladder race, best MMR first. The rows and the season name come from
  // the same source, so a count never carries another season's number.
  const liveLadder = live?.ladder.length ? live.ladder : undefined;
  const ladder = [
    ...(liveLadder ??
      w3c.map((r) => ({ race: r.race, mmr: r.mmr, league: "", division: 0, rank: 0, games: r.games, wins: r.wins, losses: r.losses }))),
  ].sort((a, b) => b.mmr - a.mmr);
  const ladderSeason = liveLadder ? live?.season : w3c[0]?.season;
  const fmtDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const dur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  // One definition of the main race for the masthead art, the large icon, the
  // bold chip and the first line of the chart. The headline MMR tile falls to
  // the first ladder row, which is the highest MMR.
  const main = mainRace(ladder);
  const mainLadder = ladder.find((r) => r.race === main) ?? ladder[0];
  // One entry per ladder race; a race with no timeline keeps its row and
  // draws no line.
  const mmrLines: MmrLine[] = ladder.map((r) => ({
    race: r.race,
    mmr: r.mmr,
    league: r.league,
    division: r.division,
    rank: r.rank,
    wins: r.wins,
    losses: r.losses,
    points: live?.timelines.find((t) => t.race === r.race)?.points ?? [],
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
  const seasonsPlayed = history.filter((h) => h.record.seriesPlayed > 0 || h.series.length > 0);
  const seasonsLabel = listSeasons(seasonsPlayed.map((h) => h.season.shortName));
  const hasGnlSeries = allTime.seriesPlayed > 0;
  // "GNL 17 series" when there is one season on record, else the total.
  const gnlSeriesLabel = seasonsPlayed.length > 1 ? "GNL series" : `${seasonsPlayed[0]?.season.shortName ?? latestSeason.shortName} series`;

  return (
    <>
      <JsonLd
        data={profilePageJsonLd({
          path,
          name: player.name,
          description: `${player.name} plays in the Gym Newbie League${team ? ` for ${team.name}` : ""}.`,
          team: team?.name,
          sameAs: w3cUrl ? [w3cUrl] : undefined,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Gym Newbie League", path: "/gnl/schedule" },
          { name: "Teams", path: "/gnl/teams" },
          { name: player.name, path },
        ])}
      />
      {/* Masthead: the main race showcase runs under the nav bar. A Random
          main race and no main race both get the shared scene, because a race
          scene states a race. */}
      <div className="keyart -mt-[var(--wg-chrome-h,var(--wg-header-h))]">
        <KeyArt
          src={main && main !== "random" ? `/factions/headers/${main}.webp` : "/keyart/feature-orc-vs-human.webp"}
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
            <ArrowLeft size={17} /> {team ? team.name : "Teams"}
          </Link>

          {/* Identity on the left, the headline numbers as a block on the right */}
          <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between xl:gap-12">
            <div className="flex min-w-0 items-center gap-5 sm:gap-6">
              {/* No main race draws no icon, so the page claims no race. */}
              {main ? (
                <span className="relative shrink-0">
                  <span aria-hidden className="absolute inset-[-20%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-60 blur-xl" />
                  <RaceIcon race={main} size={88} className="relative drop-shadow-[0_10px_20px_rgba(0,0,0,.9)]" />
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="kicker">
                  {captainOnly ? `${latestSeason.shortName} captain` : `${latestSeason.shortName} player`}
                  {history.length > 1 ? ` · ${history.length} seasons` : ""}
                </p>
                <h1
                  className={cn(
                    "mt-1 flex flex-wrap items-center gap-3 font-extrabold leading-none [overflow-wrap:anywhere] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]",
                    // Longer names step down in size so they stay on one or two lines
                    // next to the stats block instead of stacking word by word
                    player.name.length >= 15
                      ? "text-[length:clamp(1.4rem,0.6rem+1.9vw,2.1rem)]"
                      : player.name.length >= 9
                        ? "text-[length:clamp(1.75rem,0.8rem+2.6vw,2.8rem)]"
                        : "text-[length:var(--wg-text-display)]",
                  )}
                >
                  <span className="sm:whitespace-nowrap">{player.name}</span>
                  {isCaptain && !captainOnly ? <CaptainBadge /> : null}
                </h1>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
                  {/* The signup race is a season fact, so it names its season. */}
                  {player.race ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      {latestSeason.shortName} ·<RaceBadge race={player.race} />
                    </span>
                  ) : null}
                  {team ? (
                    <Link href={`/gnl/teams/${team.slug}`} className="inline-flex items-center gap-2 hover:text-gold">
                      <TeamPlate tag={team.tag!} logoUrl={team.logoUrl} name={team.name} size="sm" />
                      {team.name}
                    </Link>
                  ) : null}
                  {player.country ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Flag code={player.country} size={20} /> {player.country}
                    </span>
                  ) : null}
                  {w3cUrl ? (
                    <a href={w3cUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-gold hover:underline">
                      <W3cMark size={16} /> {player.battleTag}
                    </a>
                  ) : null}
                </p>
                {/* One chip per ladder race, so no surface reduces the player
                    to one MMR without naming its race. */}
                {ladder.length ? (
                  <div className="mt-4">
                    <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
                      <W3cMark size={13} className="opacity-70" /> Ladder games, season {ladderSeason}
                    </p>
                    <RaceMmrChips races={ladder} main={main} />
                  </div>
                ) : null}
              </div>
            </div>

            <dl className={cn("panel grid shrink-0 gap-px overflow-hidden bg-line/60", hasGnlSeries ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2")}>
              {hasGnlSeries ? (
                <Stat label={`${gnlSeriesLabel} record`} value={record(allTime.seriesWon, allTime.seriesLost) ?? DASH} />
              ) : null}
              <Stat
                label={mainLadder ? `W3C MMR · ${RACES[mainLadder.race].label}` : "W3C MMR"}
                value={mainLadder?.mmr ?? player.mmr ?? DASH}
                tone="text-gold"
              />
              {/* A ladder count names its W3Champions season, because the
                  league holds no earlier ladder season. */}
              {mainLadder ? (
                <Stat
                  label={ladderSeason ? `Ladder games · S${ladderSeason}` : "Ladder games"}
                  value={ladderSeason ? ladderGames : DASH}
                />
              ) : (
                <Stat label="Career rating" value={career?.rating ?? DASH} />
              )}
            </dl>
          </div>
        </Container>
        <div className="rivets relative z-10" aria-hidden />
      </div>

      <Container className="py-10">
        {captainOnly ? (
          <p className="mb-6 border-l-2 border-gold/60 pl-4 text-sm text-muted">
            Captains {team?.name ?? "the team"} in {latestSeason.shortName} without playing in the roster.
            {hasGnlSeries ? " The Gym Newbie League numbers below come from the seasons they played." : " The numbers below are their own ladder and career."}
          </p>
        ) : null}

        {/* Gym Newbie League vs ladder, side by side */}
        {hasGnlSeries || (!captainOnly && live) ? (
          <section>
            <h2 className="mb-4 font-display text-xl font-bold uppercase">Gym Newbie League vs ladder</h2>
            <p className="mb-4 max-w-2xl text-sm text-muted">
              Every GNL series on record against the current W3Champions ladder season, and how they go against each race.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <Compare
                title={gnlSeriesLabel}
                unit="Series"
                wins={allTime.seriesWon}
                losses={allTime.seriesLost}
                vs={gnlVsRace}
                note={seasonsPlayed.length > 1 ? `Best-of-three series across ${seasonsLabel}` : "Best-of-three series in the Gym Newbie League"}
              />
              <Compare
                title={`Ladder season ${ladderSeason ?? ""}`}
                unit="Ladder games"
                wins={ladderWins}
                losses={ladderLosses}
                vs={live?.vsRace ?? {}}
                mark
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
                    const played = h.record.seriesPlayed > 0;
                    return (
                      <div key={h.season.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          {/* The race of that season's signup, beside its season. */}
                          {h.race ? <RaceIcon race={h.race} size={18} /> : null}
                          <span className="font-display text-sm font-extrabold uppercase text-gold">{h.season.shortName}</span>
                        </span>
                        <span className="min-w-0">
                          <Link href={`/gnl/teams/${h.team.slug}?season=${h.season.number}`} className="flex items-center gap-2 text-sm text-fg hover:text-gold">
                            <TeamPlate tag={h.team.tag!} logoUrl={h.team.logoUrl} name={h.team.name} size="sm" />
                            <span className="truncate font-display font-bold uppercase">{h.team.name}</span>
                            {h.isCaptain ? <CaptainBadge compact /> : null}
                          </Link>
                          <span className="mt-0.5 block text-xs text-faint">
                            {h.captainOnly ? "Captain, not in the roster" : played ? `${h.record.seriesPlayed} series` : "No series played"}
                            {/* One icon per series, the race the opponent played. */}
                            {h.record.matchupHistory.length ? (
                              <span className="ml-2 inline-flex items-center gap-0.5 align-middle" title="Opponent race of each series">
                                {h.record.matchupHistory.map((r, i) => (
                                  <RaceIcon key={`${r}-${i}`} race={r} size={16} />
                                ))}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block font-mono text-[0.55rem] uppercase tracking-[0.14em] text-faint">Series</span>
                          <span className={cn("tnum block font-display text-lg font-bold leading-tight", played ? "text-fg" : "text-faint")}>
                            {(played ? record(h.record.seriesWon, h.record.seriesLost) : null) ?? DASH}
                          </span>
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
                <Surface className="grid grid-cols-2 divide-x divide-y divide-line/60">
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

          </div>

          <div>
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
                          <span className="tnum ml-auto">Series {record(h.record.seriesWon, h.record.seriesLost) ?? DASH}</span>
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
          </div>
        </div>

        {/* The ladder band runs the full width: the race rows on the left
            select the line of the chart on the right. */}
        {ladder.length || player.battleTag ? (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-xl font-bold uppercase">W3Champions ladder</h2>
            {ladder.length ? (
              <MmrChart lines={mmrLines} main={main} />
            ) : (
              <p className="text-sm text-faint">No ladder games this season.</p>
            )}
            {ladderSeason ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                <W3cMark size={14} className="opacity-70" /> Ladder season {ladderSeason}, {live ? "live from W3Champions" : "synced from W3Champions"}.
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
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

          <div>
            {live?.matches.length ? (
              <section>
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-xl font-bold uppercase">Recent ladder games</h2>
                  <a href={live.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted hover:text-gold">
                    <W3cMark size={15} /> All games on W3Champions
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
                          <RaceIcon race={m.race} size={22} />
                          <span className="text-faint">vs</span>
                          <RaceIcon race={m.opponent.race} size={22} />
                          <a
                            href={`https://w3champions.com/player/${encodeURIComponent(m.opponent.battleTag)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-w-0 items-center gap-1 truncate text-fg hover:text-gold"
                          >
                            {m.opponent.name} <W3cMark size={13} className="opacity-70" />
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
                          <W3cMark size={12} className="ml-1 opacity-70" />
                        </a>
                      </span>
                      <span className={cn("tnum w-9 shrink-0 text-right font-mono text-xs", m.mmrGain >= 0 ? "text-win" : "text-loss")}>
                        {signed(m.mmrGain)}
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
