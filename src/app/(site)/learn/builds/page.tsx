import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { MatchupPicker } from "@/components/builds/MatchupPicker";
import { BuildRow, BuildSpotlight } from "@/components/builds/BuildRow";
import { filterBuilds, getBuilds } from "@/lib/builds/builds";
import {
  BUILD_DIFFICULTIES,
  BUILD_RACES,
  type BuildDifficulty,
  type BuildRace,
  type BuildVsRace,
} from "@/lib/builds/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Build orders — Learn",
  description:
    "Warcraft III build orders for every race and matchup, with timings, supply counts and a play-along timer. Written by Gym coaches and the community.",
  openGraph: {
    title: "Warcraft III build orders — Warcraft 3 Gym",
    description: "Timed openings for every race and matchup, with a play-along clock. Submit your own.",
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
  const sort = sp.sort === "updated" ? "updated" : "title";

  const all = await getBuilds();
  let builds = filterBuilds(all, { race, vsRace, q });
  if (difficulty) builds = builds.filter((b) => b.difficulty === difficulty);
  builds = [...builds].sort((a, b) =>
    sort === "updated"
      ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      : a.title.localeCompare(b.title),
  );

  const featured = all.find((b) => b.featured);
  const recent = [...all]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .find((b) => b.slug !== featured?.slug);
  const isFiltered = Boolean(race || vsRace || q || difficulty);

  return (
    <>
      <PageHeader
        kicker="Learn"
        title="Build orders"
        lead="Step-by-step openings for every race and matchup — with timings, supply counts and a play-along clock."
      >
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
        >
          <ArrowLeft size={15} /> All topics
        </Link>
      </PageHeader>

      <Container className="py-10">
        {/* Spotlights */}
        {(featured || recent) && !isFiltered ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {featured ? <BuildSpotlight label="Build of the week" build={featured} /> : null}
            {recent ? <BuildSpotlight label="Recently updated" build={recent} /> : null}
          </div>
        ) : null}

        {/* Filters */}
        <div className="mt-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="kicker mb-3">Matchup</p>
            <Suspense>
              <MatchupPicker race={race} vsRace={vsRace} />
            </Suspense>
          </div>
          <form method="get" className="flex flex-wrap items-center gap-2">
            {race ? <input type="hidden" name="race" value={race} /> : null}
            {vsRace ? <input type="hidden" name="vs" value={vsRace} /> : null}
            <label className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search builds…"
                className="h-10 w-full rounded border border-line bg-surface/60 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none sm:w-56"
              />
            </label>
            <select
              name="difficulty"
              defaultValue={difficulty ?? ""}
              className="h-10 rounded border border-line bg-surface/60 px-3 text-sm text-fg focus:border-gold/60 focus:outline-none"
            >
              <option value="">Any difficulty</option>
              {BUILD_DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
            <select
              name="sort"
              defaultValue={sort}
              className="h-10 rounded border border-line bg-surface/60 px-3 text-sm text-fg focus:border-gold/60 focus:outline-none"
            >
              <option value="title">A–Z</option>
              <option value="updated">Recently updated</option>
            </select>
            <button
              type="submit"
              className="btn-gold h-10 rounded px-4 font-display text-[0.72rem] font-bold uppercase tracking-[0.1em]"
            >
              Apply
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="mt-6 flex items-center justify-between text-xs text-faint">
          <span>
            {builds.length} {builds.length === 1 ? "build" : "builds"}
            {isFiltered ? " · filtered" : ""}
          </span>
          {isFiltered ? (
            <Link href="/learn/builds" className={cn("uppercase tracking-wide text-muted hover:text-gold")}>
              Clear filters
            </Link>
          ) : null}
        </div>

        {builds.length ? (
          <ul className="mt-3 grid gap-3">
            {builds.map((b) => (
              <BuildRow key={b.slug} build={b} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            No builds match — try another matchup, or be the first to add one.
          </p>
        )}

        {/* Submit CTA */}
        <div className="panel mt-12 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-[1.1rem] font-bold tracking-[0.05em]">Got a build worth sharing?</h2>
            <p className="mt-1 text-sm text-muted">
              Submit it here — a coach reviews it and it goes up with your name on it.
            </p>
          </div>
          <ButtonLink href="/learn/builds/submit" className="shrink-0">
            Submit a build
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
