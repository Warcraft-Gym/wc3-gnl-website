import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { MatchupPicker } from "@/components/builds/MatchupPicker";
import { BuildRow } from "@/components/builds/BuildRow";
import { OverlayToast } from "@/components/builds/OverlayToast";
import { OVERLAY_BETA_LIVE } from "@/lib/flags";
import { filterBuilds, getBuilds } from "@/lib/builds/builds";
import {
  BUILD_DIFFICULTIES,
  BUILD_RACES,
  type BuildDifficulty,
  type BuildRace,
  type BuildVsRace,
} from "@/lib/builds/types";

export const metadata: Metadata = {
  title: "Warcraft III build orders",
  description:
    "Warcraft III build orders for every race and matchup, with food counts, timings and a play-along clock. Written by Gym coaches and the community.",
  // Filters live in the query string; the list is one page to search engines.
  alternates: { canonical: "/learn/builds" },
  openGraph: {
    title: "Warcraft III build orders · Warcraft 3 Gym",
    description: "Build orders for every race and matchup, with a play-along clock. Submit your own.",
    images: [{ url: "/keyart/feature-undead-city.webp", width: 1600, height: 900 }],
  },
};

type Search = {
  race?: string;
  vs?: string;
  q?: string;
  difficulty?: string;
  sort?: string;
};

const RACE_IDS = new Set(BUILD_RACES.map((r) => r.id));
const DIFF_IDS = new Set(BUILD_DIFFICULTIES.map((d) => d.id));

export default async function BuildsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const race = RACE_IDS.has(sp.race as BuildRace) ? (sp.race as BuildRace) : undefined;
  const vsRace = RACE_IDS.has(sp.vs as BuildRace) ? (sp.vs as BuildVsRace) : undefined;
  const difficulty = DIFF_IDS.has(sp.difficulty as BuildDifficulty)
    ? (sp.difficulty as BuildDifficulty)
    : undefined;
  const q = sp.q?.slice(0, 80);
  // Newest first is the default, so a build added today opens the list.
  const sort = sp.sort === "title" ? "title" : sp.sort === "updated" ? "updated" : "new";

  const all = await getBuilds();
  let builds = filterBuilds(all, { race, vsRace, q });
  if (difficulty) builds = builds.filter((b) => b.difficulty === difficulty);
  const time = (v: string) => new Date(v).getTime();
  builds = [...builds].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "updated") return time(b.updatedAt) - time(a.updatedAt);
    // Added to the site, not last edited, so fixing a typo does not reorder
    // the list. Builds published the same day fall back to the edit time.
    return time(b.publishedAt) - time(a.publishedAt) || time(b.updatedAt) - time(a.updatedAt);
  });

  const isFiltered = Boolean(race || vsRace || q || difficulty);

  return (
    <>
      <PageHeader
        kicker="Learn"
        title="Build orders"
        art="/graphics/build-orders-2.webp"
        lead="Step-by-step build orders for every race and matchup, with timings, supply counts and a play-along clock."
      />

      <Container className="py-10">
        {/* Submit CTA */}
        <div className="panel relative overflow-hidden border-gold/40 p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{ backgroundImage: "radial-gradient(28rem 14rem at 100% 120%, var(--wg-gold-glow), transparent 65%)" }}
          />
          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="kicker">Community builds</p>
              <h2 className="mt-2 text-[1.15rem] font-bold tracking-[0.05em]">Got a build worth sharing?</h2>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Submit it here, no account needed. A coach reviews it and it goes up with your name on it.
              </p>
            </div>
            <ButtonLink href="/learn/builds/submit" size="lg" className="shrink-0">
              Submit a build
            </ButtonLink>
          </div>
        </div>

        {/* Matchup + filters, the way in */}
        <section className="mt-12">
          <Suspense>
            <MatchupPicker
              race={race}
              vsRace={vsRace}
              q={q}
              difficulty={difficulty}
              sort={sort}
              count={builds.length}
            />
          </Suspense>
        </section>

        {/* Results */}
        {builds.length ? (
          <ul className="mt-6 grid gap-2.5">
            {builds.map((b) => (
              <BuildRow key={b.slug} build={b} />
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded border border-dashed border-line px-5 py-12 text-center">
            <p className="text-sm text-muted">No builds match that matchup yet.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/learn/builds" className="text-xs uppercase tracking-wide text-muted hover:text-gold">
                Clear filters
              </Link>
              <Link href="/learn/builds/submit" className="text-xs uppercase tracking-wide text-gold hover:underline">
                Be the first to add one
              </Link>
            </div>
          </div>
        )}
        {isFiltered && builds.length ? (
          <p className="mt-3 text-right text-xs text-faint">
            <Link href="/learn/builds" className="uppercase tracking-wide hover:text-gold">
              Clear filters
            </Link>
          </p>
        ) : null}

      </Container>

      {/* Overlay beta nudge, slides in after a few seconds */}
      {OVERLAY_BETA_LIVE ? <OverlayToast /> : null}
    </>
  );
}
