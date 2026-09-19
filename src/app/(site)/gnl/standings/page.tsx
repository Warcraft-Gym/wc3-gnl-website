import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { StandingsTable } from "@/components/league/StandingsTable";
import { DataSourceNote } from "@/components/DataSourceNote";
import { getActiveSeason, getStandings } from "@/lib/api/gnl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GNL standings",
  description: "The Gym Newbie League team ladder: wins, losses, map differential and points for the current season.",
  alternates: { canonical: "/gnl/standings" },
};

export default async function StandingsPage() {
  const [season, { rows, source }] = await Promise.all([
    getActiveSeason(),
    getStandings(),
  ]);

  return (
    <>
      <PageHeader
        kicker={`${season.shortName} · Ladder`}
        title="Standings"
        lead="Every solo series earns points for the team: 4 for a 2-0, 3 for a 2-1, and 1 even for a 1-2. The table is the sum of those points."
      />
      <Container className="py-10">
        <DataSourceNote source={source} />
        <StandingsTable rows={rows} />
        <p className="mt-4 text-xs text-faint">
          <span className="font-mono uppercase tracking-wide text-muted">P</span> weeks played
          <span className="mx-2">·</span>
          <span className="font-mono uppercase tracking-wide text-muted">Form</span> last five fixtures, oldest first
          <span className="mx-2">·</span>
          <span className="font-mono uppercase tracking-wide text-muted">Diff</span> series points scored minus conceded
          <span className="mx-2">·</span>
          <span className="font-mono uppercase tracking-wide text-muted">Pts</span> league points, 4 for a 2-0 series, 3 for a 2-1, 1 for a 1-2
        </p>
      </Container>
    </>
  );
}
