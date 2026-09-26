import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { StandingsTable } from "@/components/league/StandingsTable";
import { DataSourceNote } from "@/components/DataSourceNote";
import { PastSeasonNote } from "@/components/league/PastSeasonNote";
import { getSeason, getSeasons, getStandings } from "@/lib/api/gnl";
import { parseSeasonParam, type SeasonSearchParams } from "@/lib/api/season-params";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<SeasonSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const season = await getSeason(parseSeasonParam((await searchParams).season));
  return {
    title: season ? `${season.shortName} standings` : "GNL standings",
    description: `The Gym Newbie League team ladder${season ? ` for ${season.shortName}` : ""}: wins, losses, map differential and points.`,
    alternates: { canonical: "/gnl/standings" },
  };
}

export default async function StandingsPage({ searchParams }: Props) {
  const seasons = await getSeasons();
  const season = await getSeason(parseSeasonParam((await searchParams).season));
  if (!season) notFound();
  const { rows, source } = await getStandings(season.number);

  return (
    <>
      <PageHeader
        kicker={`${season.shortName} · Table`}
        title="Standings"
        lead="Every solo series earns points for the team: 4 for a 2-0, 3 for a 2-1, and 1 even for a 1-2. The table is the sum of those points."
      />
      <Container className="py-10">
        <DataSourceNote source={source} />
        <PastSeasonNote season={season} latest={seasons[0]} href="/gnl/standings" />
        <StandingsTable rows={rows} />
        <p className="mt-4 text-xs text-faint">
          <span className="font-mono uppercase tracking-wide text-muted">P W D L</span> weekly fixtures played, won, drawn and lost
          <span className="mx-2">·</span>
          <span className="font-mono uppercase tracking-wide text-muted">Form</span> last five fixtures, oldest first
          <span className="mx-2">·</span>
          <span className="font-mono uppercase tracking-wide text-muted">Diff</span> series points scored minus conceded
          <span className="mx-2">·</span>
          <span className="font-mono uppercase tracking-wide text-muted">Pts</span> Gym Newbie League points, 4 for a 2-0 series, 3 for a 2-1, 1 for a 1-2
        </p>
      </Container>
    </>
  );
}
