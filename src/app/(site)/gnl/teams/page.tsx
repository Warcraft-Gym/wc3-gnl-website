import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamCard } from "@/components/league/TeamCard";
import { DataSourceNote } from "@/components/DataSourceNote";
import { PastSeasonNote } from "@/components/league/PastSeasonNote";
import { getSeason, getSeasons, getStandings, getTeams } from "@/lib/api/gnl";
import { parseSeasonParam, type SeasonSearchParams } from "@/lib/api/season-params";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<SeasonSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const season = await getSeason(parseSeasonParam((await searchParams).season));
  return {
    title: season ? `${season.shortName} teams` : "GNL teams",
    description: `Every team in ${season ? season.shortName : "the current Gym Newbie League season"}, with captains and rosters.`,
    alternates: { canonical: "/gnl/teams" },
  };
}

export default async function TeamsPage({ searchParams }: Props) {
  const seasons = await getSeasons();
  const season = await getSeason(parseSeasonParam((await searchParams).season));
  if (!season) notFound();
  const [{ teams, source }, { rows }] = await Promise.all([
    getTeams(season.number),
    getStandings(season.number),
  ]);
  const standingOf = new Map(rows.map((r) => [r.team.id, r]));
  // Teams in table order, so the page reads as a season summary.
  const ordered = [...teams].sort(
    (a, b) => (standingOf.get(a.id)?.rank ?? 99) - (standingOf.get(b.id)?.rank ?? 99),
  );

  return (
    <>
      <PageHeader
        kicker={`${season.shortName} · Roster`}
        title="Teams"
        lead={`${teams.length} teams drafted for ${season.shortName}, in table order. Open a team for its full roster and results.`}
      />
      <Container className="py-10">
        <DataSourceNote source={source} />
        <PastSeasonNote season={season} latest={seasons[0]} href="/gnl/teams" />
        <div className="grid gap-4 lg:grid-cols-2">
          {ordered.map((t) => (
            <TeamCard key={t.id} team={t} standing={standingOf.get(t.id)} />
          ))}
        </div>
      </Container>
    </>
  );
}
