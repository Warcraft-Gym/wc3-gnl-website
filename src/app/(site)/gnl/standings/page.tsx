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

const LEGEND: [string, string][] = [
  ["P", "Weeks played"],
  ["W D L", "Team fixtures won, drawn and lost"],
  ["Diff", "Series points scored minus series points conceded"],
  ["Streak", "Current run of results, W3 is three wins in a row"],
  ["Pts", "League points: 4 for a 2-0 series, 3 for a 2-1, 1 for a 1-2"],
];

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
        <dl className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {LEGEND.map(([key, meaning]) => (
            <div key={key} className="flex items-baseline gap-3">
              <dt className="w-14 shrink-0 font-mono text-[0.68rem] font-bold uppercase tracking-[0.16em] text-gold">{key}</dt>
              <dd className="text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </>
  );
}
