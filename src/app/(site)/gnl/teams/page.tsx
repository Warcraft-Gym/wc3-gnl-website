import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamCard } from "@/components/league/TeamCard";
import { DataSourceNote } from "@/components/DataSourceNote";
import { getActiveSeason, getStandings, getTeams } from "@/lib/api/gnl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GNL teams",
  description: "Every team in the current Gym Newbie League season, with captains and rosters.",
  alternates: { canonical: "/gnl/teams" },
};

export default async function TeamsPage() {
  const [season, { teams, source }, { rows }] = await Promise.all([
    getActiveSeason(),
    getTeams(),
    getStandings(),
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
        <div className="grid gap-4 lg:grid-cols-2">
          {ordered.map((t) => (
            <TeamCard key={t.id} team={t} standing={standingOf.get(t.id)} />
          ))}
        </div>
      </Container>
    </>
  );
}
