import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { StandingsTable } from "@/components/league/StandingsTable";
import { DataSourceNote } from "@/components/DataSourceNote";
import { getActiveSeason, getStandings } from "@/lib/api/gnl";

export const metadata: Metadata = {
  title: "Standings",
  description: "The GNL team ladder — wins, losses, map differential and points.",
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
        lead="Points from series wins. Ties broken by map differential. Top four advance to the playoff bracket."
      />
      <Container className="py-10">
        <DataSourceNote source={source} />
        <StandingsTable rows={rows} />
        <p className="mt-5 font-mono text-xs uppercase tracking-wide text-faint">
          P played · W won · L lost · Diff map differential · Pts points (3 per series win)
        </p>
      </Container>
    </>
  );
}
