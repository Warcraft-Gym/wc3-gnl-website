import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { KeyArt } from "@/components/ui/KeyArt";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { Flag } from "@/components/ui/Flag";
import { TeamPlate } from "@/components/league/VsBadge";
import { TeamFixtureRow } from "@/components/league/TeamFixtureRow";
import { SeasonSwitcher } from "@/components/league/SeasonSwitcher";
import { PastSeasonNote } from "@/components/league/PastSeasonNote";
import { getTeamPage } from "@/lib/api/gnl";
import { record } from "@/lib/figures.mjs";
import { parseSeasonParam as parseSeason, withSeason, type SeasonSearchParams } from "@/lib/api/season-params";
import { cn, RACES, type Race } from "@/lib/utils";

// Reads ?season= and the live backend, so it renders per request like the
// other league pages.
export const dynamic = "force-dynamic";

const RACE_ORDER: Race[] = ["human", "orc", "nightelf", "undead", "random"];

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SeasonSearchParams>;
};

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const [{ slug }, { season }] = await Promise.all([params, searchParams]);
  const data = await getTeamPage(slug, parseSeason(season));
  if (!data) return { title: "Team" };
  const { team } = data;
  return {
    title: `${team.name}, ${data.season.shortName} team`,
    description: `${team.name} in the Gym Newbie League ${data.season.shortName}: roster, captains, standing, fixtures and series.`,
    // One canonical per team: the newest season's page.
    alternates: { canonical: `/gnl/teams/${team.slug}` },
  };
}

/** One headline figure with its label; the scope sits in the section kicker. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg/85 px-4 py-3 sm:px-5 sm:py-4">
      <dt className="whitespace-nowrap font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">{label}</dt>
      <dd className="tnum mt-1 font-display text-xl font-bold leading-none text-fg">{children}</dd>
    </div>
  );
}

export default async function TeamPage({ params, searchParams }: Params) {
  const [{ slug }, { season: seasonParam }] = await Promise.all([params, searchParams]);
  const data = await getTeamPage(slug, parseSeason(seasonParam));
  if (!data) notFound();
  const { team, season, seasons, standing, fixtures: teamFixtures } = data;

  // Same figures as the team card on the index, so the two pages agree.
  const rated = team.players.filter((p) => p.mmr);
  const avgMmr = rated.length ? Math.round(rated.reduce((n, p) => n + (p.mmr ?? 0), 0) / rated.length) : undefined;
  const roster = [...team.players].sort((a, b) => (b.mmr ?? 0) - (a.mmr ?? 0));
  // A player with no signup race is in neither the bar nor the count.
  const races = RACE_ORDER.map((r) => ({ race: r, n: team.players.filter((p) => p.race === r).length })).filter((x) => x.n);
  const raced = races.reduce((n, x) => n + x.n, 0);
  const makeup = races.map((x) => `${x.n} ${RACES[x.race].label}`).join(", ");
  // Best-of-three series won and lost across every fixture of the season.
  const series = teamFixtures.flatMap((f) =>
    f.matches
      .filter((m) => m.status === "completed")
      .map((m) => (f.home.id === team.id ? m.home.score > m.away.score : m.away.score > m.home.score)),
  );
  const seriesWon = series.filter(Boolean).length;
  const seriesLost = series.length - seriesWon;
  const fixtureRecord = standing ? record(standing.wins, standing.losses, standing.draws) : null;
  const hasRecords = team.players.some((p) => p.record);

  return (
    <>
      {/* Masthead: the league scene runs under the nav bar, as on the other GNL pages */}
      <div className="keyart -mt-[var(--wg-chrome-h,var(--wg-header-h))]">
        <KeyArt src="/keyart/feature-undead-city.webp" position="center 40%" overlay="soft" priority />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(0,0,0,.8)_0%,rgba(0,0,0,.55)_45%,rgba(0,0,0,.2)_100%)]"
        />
        <Container className="relative z-10 pb-12 pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+2.5rem)] sm:pb-14 sm:pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+3rem)]">
          <Link
            href={withSeason("/gnl/teams", season.number === seasons[0]?.number ? undefined : season.number)}
            className="mb-6 inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> All teams
          </Link>

          {/* Identity on the left, the season's headline figures as a block on the right */}
          <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between xl:gap-12">
            <div className="flex min-w-0 flex-1 items-center gap-5">
              <TeamPlate tag={team.tag!} logoUrl={team.logoUrl} name={team.name} size="lg" />
              <div className="min-w-0">
                <p className="kicker">
                  {season.shortName}
                  {seasons.length > 1 ? ` · ${seasons.length} seasons` : ""}
                </p>
                <h1
                  className={cn(
                    "mt-1 font-extrabold leading-none",
                    // Long names step down so they keep their place beside the stats block
                    team.name.length >= 20
                      ? "text-[length:clamp(1.4rem,0.6rem+1.9vw,2.1rem)]"
                      : team.name.length >= 12
                        ? "text-[length:clamp(1.75rem,0.8rem+2.6vw,2.8rem)]"
                        : "text-[length:var(--wg-text-display)]",
                  )}
                >
                  {team.name}
                </h1>
                {team.captains.length ? (
                  <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                    {team.captains.map((c) => (
                      <li key={c.id} className="inline-flex items-center gap-1.5 text-fg">
                        <Crown size={13} className="shrink-0 text-gold" aria-label="Captain" />
                        {c.race ? <RaceBadge race={c.race} showLabel={false} /> : null}
                        <Flag code={c.country} size={14} className="shrink-0" />
                        <Link href={`/gnl/players/${c.slug}`} className="transition-colors hover:text-gold">
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <dl className="panel grid shrink-0 grid-cols-2 gap-px overflow-hidden bg-line/60 sm:grid-cols-4 xl:grid-cols-2">
              <Stat label="Standing">
                {standing ? (
                  <>
                    <span className={standing.rank === 1 ? "text-gold" : undefined}>#{standing.rank}</span>
                    <span className="ml-1.5 font-sans text-xs font-normal text-muted">{standing.points} pts</span>
                  </>
                ) : (
                  "—"
                )}
              </Stat>
              {/* Won, drawn and lost weekly fixtures, not the series inside them. */}
              <Stat label="Fixtures">{fixtureRecord ?? "—"}</Stat>
              <Stat label="Series">{record(seriesWon, seriesLost) ?? "—"}</Stat>
              <Stat label="Avg MMR">{avgMmr ?? "—"}</Stat>
            </dl>
          </div>

          {seasons.length > 1 ? (
            <div className="mt-8">
              <SeasonSwitcher
                seasons={seasons}
                active={season.number}
                href={(n) => withSeason(`/gnl/teams/${team.slug}`, n === seasons[0].number ? undefined : n)}
              />
            </div>
          ) : null}
        </Container>
        <div className="rivets relative z-10" aria-hidden />
      </div>

      <Container className="py-10">
        <PastSeasonNote season={season} latest={seasons[0]} href={`/gnl/teams/${team.slug}`} />

        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <section>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-bold uppercase">Roster</h2>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
                {team.players.length} players
              </span>
            </div>

            {/* Race make-up of the roster, signup races of this season */}
            {races.length ? (
              <div className="mb-4">
                <div role="img" aria-label={`Race make-up of ${raced} players: ${makeup}`} className="flex h-1.5 w-full gap-0.5">
                  {races.map((x) => (
                    <span key={x.race} className={cn("h-full rounded-sm", RACES[x.race].dot)} style={{ width: `${(x.n / raced) * 100}%` }} />
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

            <Surface>
              <div
                className={cn(
                  "grid gap-3 border-b border-line/60 px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint",
                  hasRecords ? "grid-cols-[minmax(0,1fr)_5.5rem_3.5rem]" : "grid-cols-[minmax(0,1fr)_3.5rem]",
                )}
              >
                <span>Player</span>
                {hasRecords ? <span className="text-right">Series</span> : null}
                <span className="text-right" title="W3Champions MMR of the signup race">
                  MMR
                </span>
              </div>
              <ul className="divide-y divide-line/60">
                {roster.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      "grid items-center gap-3 px-4 py-2.5 text-sm",
                      hasRecords ? "grid-cols-[minmax(0,1fr)_5.5rem_3.5rem]" : "grid-cols-[minmax(0,1fr)_3.5rem]",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {p.race ? <RaceBadge race={p.race} showLabel={false} /> : null}
                      <Flag code={p.country} size={14} className="shrink-0" />
                      <Link
                        href={`/gnl/players/${p.slug}`}
                        className={cn("truncate font-display font-bold uppercase transition-colors hover:text-gold", p.isCaptain ? "text-fg" : "text-fg/90")}
                      >
                        {p.name}
                      </Link>
                      {p.isCaptain ? <Crown size={11} className="shrink-0 text-gold" aria-label="Captain" /> : null}
                    </span>
                    {hasRecords ? (
                      <span className="tnum text-right font-mono text-xs text-muted">
                        {p.record ? (record(p.record.wins, p.record.losses) ?? "—") : "—"}
                      </span>
                    ) : null}
                    <span className="tnum text-right font-mono text-xs text-fg">{p.mmr ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </Surface>
            <p className="mt-2 text-xs text-faint">
              Race and MMR are the signup race of {season.shortName} and its current W3Champions MMR.
            </p>
          </section>

          <section>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-bold uppercase">Fixtures</h2>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
                {season.shortName} · {team.name} first
              </span>
            </div>
            {teamFixtures.length ? (
              <Surface>
                <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] gap-3 border-b border-line/60 px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint sm:grid-cols-[3.25rem_minmax(0,1fr)_7rem_auto_2rem] sm:gap-4">
                  <span>Week</span>
                  <span>Opponent</span>
                  <span className="hidden text-right sm:block">Series</span>
                  <span className="text-right">Points</span>
                  <span className="hidden sm:block" />
                </div>
                <ul className="divide-y divide-line/60">
                  {teamFixtures.map((f) => (
                    <TeamFixtureRow key={f.id} fixture={f} teamId={team.id} />
                  ))}
                </ul>
              </Surface>
            ) : (
              <p className="border border-dashed border-line px-5 py-8 text-center text-sm text-faint">
                No fixtures recorded for this team in {season.shortName}.
              </p>
            )}
            <p className="mt-2 text-xs text-faint">
              Points are the league points each side took from the week&apos;s series. Open a week for every series and cast.
            </p>
          </section>
        </div>
      </Container>
    </>
  );
}
