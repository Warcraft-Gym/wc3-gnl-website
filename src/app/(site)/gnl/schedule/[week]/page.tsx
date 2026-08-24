import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { WeekSelector } from "@/components/league/WeekSelector";
import { FixtureRow } from "@/components/league/FixtureRow";
import { DataSourceNote } from "@/components/DataSourceNote";
import { Badge } from "@/components/ui/Badge";
import { getActiveSeason, getWeeks, getWeekFixtures } from "@/lib/api/gnl";

type Params = { params: Promise<{ week: string }> };

export async function generateStaticParams() {
  const { weeks } = await getWeeks();
  return weeks.map((w) => ({ week: String(w.number) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { week } = await params;
  return { title: `Schedule — Week ${week}` };
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

        <div className="mb-8">
          <WeekSelector weeks={weeks} active={week.number} />
        </div>

        {fixtures.length ? (
          <div className="flex flex-col gap-4">
            {fixtures.map((f) => (
              <FixtureRow key={f.id} fixture={f} />
            ))}
          </div>
        ) : (
          <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            No fixtures scheduled for this week yet.
          </p>
        )}
      </Container>
    </>
  );
}
