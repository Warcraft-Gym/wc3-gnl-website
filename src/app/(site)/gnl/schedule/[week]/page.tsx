import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { WeekSelector } from "@/components/league/WeekSelector";
import { FixtureRow } from "@/components/league/FixtureRow";
import { DataSourceNote } from "@/components/DataSourceNote";
import { Badge } from "@/components/ui/Badge";
import { getActiveSeason, getWeeks, getWeekFixtures } from "@/lib/api/gnl";
import { WeekSummary } from "@/components/league/WeekSummary";

type Params = { params: Promise<{ week: string }> };

export async function generateStaticParams() {
  const { weeks } = await getWeeks();
  return weeks.map((w) => ({ week: String(w.number) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { week } = await params;
  return {
    title: `GNL schedule, week ${week}`,
    description: `Gym Newbie League fixtures and results for week ${week}: every series, map score and player matchup.`,
    alternates: { canonical: `/gnl/schedule/${week}` },
  };
}

export default async function ScheduleWeekPage({ params }: Params) {
  const { week: weekParam } = await params;
  const weekNum = Number(weekParam);
  if (!Number.isInteger(weekNum)) notFound();

  const [season, { weeks }, { week, fixtures, source }] = await Promise.all([
    getActiveSeason(),
    getWeeks(),
    getWeekFixtures(weekNum),
  ]);

  if (!week) notFound();
  // A week whose start date is later than the newest fixture on record is
  // still to come; a rule based on the clock would be impure in render.
  const isFuture = weeks.some((w) => w.isCurrent && w.number < week.number);

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

        <div className="mb-6">
          <WeekSelector weeks={weeks} active={week.number} />
        </div>

        {fixtures.length ? (
          <>
            <WeekSummary fixtures={fixtures} />
            <div className="mt-6 flex flex-col gap-4">
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
