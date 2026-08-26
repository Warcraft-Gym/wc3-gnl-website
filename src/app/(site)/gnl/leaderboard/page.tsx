import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { LeaderboardTable } from "@/components/league/LeaderboardTable";
import { DataSourceNote } from "@/components/DataSourceNote";
import { getActiveSeason, getLeaderboard } from "@/lib/api/gnl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Individual player rankings across the current GNL season.",
};

const PAGE_SIZE = 25;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [season, { rows, source }] = await Promise.all([
    getActiveSeason(),
    getLeaderboard(),
  ]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const raw = (await searchParams).page;
  const requested = Number(Array.isArray(raw) ? raw[0] : raw) || 1;
  const page = Math.min(Math.max(requested, 1), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  return (
    <>
      <PageHeader
        kicker={`${season.shortName} · Players`}
        title="Leaderboard"
        lead="Individual results across all weeks. Every race, every skill bracket — the Gym is for everyone."
      />
      <Container className="py-10">
        <DataSourceNote source={source} />
        <LeaderboardTable rows={pageRows} />
        {rows.length > 0 ? (
          <p className="mt-4 text-center font-mono text-xs uppercase tracking-wide text-faint">
            {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length} players
          </p>
        ) : null}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/gnl/leaderboard"
        />
      </Container>
    </>
  );
}
