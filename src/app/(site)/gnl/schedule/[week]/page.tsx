import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { WeekSelector } from "@/components/league/WeekSelector";
import { FixtureRow } from "@/components/league/FixtureRow";
import { DataSourceNote } from "@/components/DataSourceNote";
import { Badge } from "@/components/ui/Badge";
import { PastSeasonNote } from "@/components/league/PastSeasonNote";
import { getSeason, getSeasons, getWeeks, getWeekFixtures } from "@/lib/api/gnl";
import { parseSeasonParam, type SeasonSearchParams } from "@/lib/api/season-params";
import { WeekSummary } from "@/components/league/WeekSummary";

// Reads ?season=, so it renders per request like the other league pages.
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ week: string }>;
  searchParams: Promise<SeasonSearchParams>;
};

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const [{ week }, query] = await Promise.all([params, searchParams]);
  const season = await getSeason(parseSeasonParam(query.season));
  return {
    title: `${season?.shortName ?? "GNL"} schedule, week ${week}`,
    description: `Gym Newbie League fixtures and results for week ${week}${season ? ` of ${season.shortName}` : ""}: every series, map score and player matchup.`,
    alternates: { canonical: `/gnl/schedule/${week}` },
  };
}

export default async function ScheduleWeekPage({ params, searchParams }: Params) {
  const [{ week: weekParam }, query] = await Promise.all([params, searchParams]);
  const weekNum = Number(weekParam);
  if (!Number.isInteger(weekNum)) notFound();

  const seasons = await getSeasons();
  const season = await getSeason(parseSeasonParam(query.season));
  if (!season) notFound();
  const [{ weeks }, { week, fixtures, source }] = await Promise.all([
    getWeeks(season.number),
    getWeekFixtures(weekNum, season.number),
  ]);

  if (!week) notFound();
  // A week whose start date is later than the newest fixture on record is
  // still to come; a rule based on the clock would be impure in render.
  const isFuture = season.isActive && season.currentWeek < week.number;

  return (
    <>
      <PageHeader kicker={`${season.shortName} · Schedule`} title={`Week ${week.number}`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono text-sm uppercase tracking-widest text-muted">
            {week.label}
          </span>
          {week.isCurrent ? <Badge tone="gold">Current week</Badge> : null}
        </div>
      </PageHeader>

      <Container className="py-10">
        <DataSourceNote source={source} />
        <PastSeasonNote season={season} latest={seasons[0]} href="/gnl/schedule" />

        <div className="mb-6">
          <WeekSelector weeks={weeks} active={week.number} />
        </div>

        {fixtures.length ? (
          <>
            <WeekSummary fixtures={fixtures} />
            <div className="flex flex-col gap-4 [&:not(:first-child)]:mt-6">
              {fixtures.map((f) => (
                <FixtureRow key={f.id} fixture={f} defaultOpen={week.isCurrent} />
              ))}
            </div>
          </>
        ) : (
          <div className="border border-dashed border-line px-5 py-10 text-center">
            <p className="font-display text-sm font-bold uppercase tracking-[0.08em] text-fg">
              Week {week.number}, {week.label}
            </p>
            <p className="mt-2 text-sm text-faint">
              {isFuture
                ? "Fixtures for this week are set once the draft is done and the week before it is played."
                : "No fixtures were recorded for this week."}
            </p>
          </div>
        )}
      </Container>
    </>
  );
}
