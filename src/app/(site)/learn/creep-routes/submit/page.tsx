import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { RouteSubmitForm } from "@/components/creep-routes/RouteSubmitForm";
import { CREEP_ROUTES_LIVE } from "@/lib/flags";
import { getCreepMaps } from "@/lib/creep-routes/maps";
import { getBuilds } from "@/lib/builds/builds";
import { canAcceptSubmissions } from "@/lib/creep-routes/submit";
import { BUILD_RACES, type BuildRace } from "@/lib/builds/types";
import { ROUTE_LEVELS, type RouteLevel } from "@/lib/creep-routes/types";

export const metadata: Metadata = {
  title: "Submit a creep route",
  description:
    "Click camps on the map to build a Warcraft III creep route and share it. A coach reviews it and publishes it with your name on it.",
  robots: { index: false },
};

// `?map=&race=&vs=&level=` prefills the setup row — a "start a route for
// this matchup" link (e.g. the list page's "Be the first to add one" empty
// state, below) would otherwise be impossible to share; every value is
// validated against the known ids, same silent-ignore-if-invalid rule the
// list page's own URL params already follow (gaps.md #3).
type Search = { map?: string; race?: string; vs?: string; level?: string };

const RACE_IDS = new Set(BUILD_RACES.map((r) => r.id));
const LEVEL_IDS = new Set(ROUTE_LEVELS.map((l) => l.id));

export default async function SubmitCreepRoutePage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!CREEP_ROUTES_LIVE) notFound();
  const sp = await searchParams;
  const [maps, builds] = await Promise.all([getCreepMaps(), getBuilds()]);
  const defaultMapSlug = maps.some((m) => m.slug === sp.map) ? sp.map : maps[0]?.slug;
  const defaultRace = RACE_IDS.has(sp.race as BuildRace) ? (sp.race as BuildRace) : undefined;
  const defaultVs = RACE_IDS.has(sp.vs as BuildRace) ? (sp.vs as BuildRace) : undefined;
  const defaultLevel = LEVEL_IDS.has(sp.level as RouteLevel) ? (sp.level as RouteLevel) : undefined;

  return (
    <>
      <PageHeader
        kicker="Learn · Creep routes"
        title="Submit a creep route"
        art="/graphics/creep-routes-1.webp"
        lead="Click camps on the map to build the route, no drawing, no typing camp contents. A coach reviews it, then it goes up with your name on it."
      />
      <Container className="max-w-6xl py-10">
        <RouteSubmitForm
          maps={maps}
          builds={builds.map((b) => ({ slug: b.slug, title: b.title }))}
          defaultMapSlug={defaultMapSlug}
          defaultRace={defaultRace}
          defaultVsRaces={defaultVs ? [defaultVs] : undefined}
          defaultLevel={defaultLevel}
          submissionsOpen={canAcceptSubmissions()}
        />
      </Container>
    </>
  );
}
