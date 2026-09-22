import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { RouteFilters } from "@/components/creep-routes/RouteFilters";
import { RouteRow } from "@/components/creep-routes/RouteRow";
import { CREEP_ROUTES_LIVE } from "@/lib/flags";
import { filterCreepRoutes, getCreepRoutes } from "@/lib/creep-routes/routes";
import { getCreepMaps } from "@/lib/creep-routes/maps";
import { getCategory } from "@/lib/learn/data";
import { learnArt } from "@/lib/learn/art";
import { ROUTE_LEVELS, type RouteLevel } from "@/lib/creep-routes/types";
import { BUILD_RACES, type BuildRace, type BuildVsRace } from "@/lib/builds/types";

export const metadata: Metadata = {
  title: "Warcraft III creep routes",
  description:
    "Warcraft III creep routes for every race and map: which camps to clear, and in what order. Written by Gym coaches and the community.",
  // Filters live in the query string; the list is one page to search engines.
  alternates: { canonical: "/learn/creep-routes" },
  openGraph: {
    title: "Warcraft III creep routes · Warcraft 3 Gym",
    description: "Creep routes for every race and map. Submit your own.",
    images: [{ url: "/graphics/creep-routes-1.webp", width: 1600, height: 900 }],
  },
};

type Search = {
  race?: string;
  vs?: string;
  map?: string;
  level?: string;
  q?: string;
  sort?: string;
};

const RACE_IDS = new Set(BUILD_RACES.map((r) => r.id));
const LEVEL_IDS = new Set(ROUTE_LEVELS.map((l) => l.id));

export default async function CreepRoutesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!CREEP_ROUTES_LIVE) notFound();
  const sp = await searchParams;
  const race = RACE_IDS.has(sp.race as BuildRace) ? (sp.race as BuildRace) : undefined;
  const vsRace = RACE_IDS.has(sp.vs as BuildRace) ? (sp.vs as BuildVsRace) : undefined;
  const level = LEVEL_IDS.has(sp.level as RouteLevel) ? (sp.level as RouteLevel) : undefined;
  const q = sp.q?.slice(0, 80);
  const sort = sp.sort === "title" ? "title" : "updated";

  const [all, mapList] = await Promise.all([getCreepRoutes(), getCreepMaps()]);
  const map = mapList.some((m) => m.slug === sp.map) ? sp.map : undefined;

  let routes = filterCreepRoutes(all, { race, vsRace, map, level, q });
  routes = [...routes].sort((a, b) =>
    sort === "updated"
      ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      : a.title.localeCompare(b.title),
  );

  const isFiltered = Boolean(race || vsRace || map || level || q);
  const category = getCategory("creep-routes");

  return (
    <>
      <PageHeader
        kicker="Learn"
        title="Warcraft III creep routes"
        art={category ? learnArt(category) : null}
        lead="Which camps to clear, and in what order. Pick a race and a map, or search for a route."
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
              <p className="kicker">Community routes</p>
              <h2 className="mt-2 text-[1.15rem] font-bold tracking-[0.05em]">Got a route worth sharing?</h2>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Submit it here, no account needed. A coach reviews it and it goes up with your name on it.
              </p>
            </div>
            <ButtonLink href="/learn/creep-routes/submit" size="lg" className="shrink-0">
              Submit a route
            </ButtonLink>
          </div>
        </div>

        {/* Matchup + filters, the way in */}
        <section className="mt-12">
          <Suspense>
            <RouteFilters
              race={race}
              vsRace={vsRace}
              map={map}
              level={level}
              q={q}
              sort={sort}
              maps={mapList.map((m) => ({ slug: m.slug, name: m.name }))}
              count={routes.length}
            />
          </Suspense>
        </section>

        <p className="mt-6 max-w-2xl text-sm text-muted">
          New to reading a creep camp?{" "}
          <Link href="/learn/guide/reading-creep-camps-and-drops" className="text-gold hover:underline">
            Read: how to read creep camps and item drops
          </Link>
          .
        </p>

        {/* Results */}
        {routes.length ? (
          <ul className="mt-6 grid gap-2.5">
            {routes.map((r) => (
              <RouteRow key={r.slug} route={r} />
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded border border-dashed border-line px-5 py-12 text-center">
            <p className="text-sm text-muted">No creep routes match those filters yet.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/learn/creep-routes" className="text-xs uppercase tracking-wide text-muted hover:text-gold">
                Clear filters
              </Link>
              <Link href="/learn/creep-routes/submit" className="text-xs uppercase tracking-wide text-gold hover:underline">
                Be the first to add one
              </Link>
            </div>
          </div>
        )}
        {isFiltered && routes.length ? (
          <p className="mt-3 text-right text-xs text-faint">
            <Link href="/learn/creep-routes" className="uppercase tracking-wide hover:text-gold">
              Clear filters
            </Link>
          </p>
        ) : null}
      </Container>
    </>
  );
}
