import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { TeamCard } from "@/components/league/TeamCard";
import { DataSourceNote } from "@/components/DataSourceNote";
import { getActiveSeason, getTeams } from "@/lib/api/gnl";

export const metadata: Metadata = {
  title: "Teams",
  description: "The teams competing in the current GNL season.",
};

export default async function TeamsPage() {
  const [season, { teams, source }] = await Promise.all([
    getActiveSeason(),
    getTeams(),
  ]);

  return (
    <>
      <PageHeader
        kicker={`${season.shortName} · Roster`}
        title="Teams"
        lead={`${teams.length} teams drafted for the season. Open a team for its full roster and results.`}
      />
      <Container className="py-10">
        <DataSourceNote source={source} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      </Container>
    </>
  );
}
