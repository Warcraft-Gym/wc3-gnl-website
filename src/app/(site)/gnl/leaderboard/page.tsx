import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeaderboardTable } from "@/components/league/LeaderboardTable";
import { DataSourceNote } from "@/components/DataSourceNote";
import { getActiveSeason, getLeaderboard } from "@/lib/api/gnl";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Individual player rankings across the current GNL season.",
};

export default async function LeaderboardPage() {
  const [season, { rows, source }] = await Promise.all([
    getActiveSeason(),
    getLeaderboard(),
  ]);

  return (
    <>
      <PageHeader
        kicker={`${season.shortName} · Players`}
        title="Leaderboard"
        lead="Individual results across all weeks. Every race, every skill bracket — the Gym is for everyone."
      />
      <Container className="py-10">
        <DataSourceNote source={source} />
        <LeaderboardTable rows={rows} />
      </Container>
    </>
  );
}
