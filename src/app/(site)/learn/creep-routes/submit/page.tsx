import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { RouteSubmitForm } from "@/components/creep-routes/RouteSubmitForm";
import { CREEP_ROUTES_LIVE } from "@/lib/flags";
import { getCreepMaps } from "@/lib/creep-routes/maps";
import { getBuilds } from "@/lib/builds/builds";
import { canAcceptSubmissions } from "@/lib/creep-routes/submit";

export const metadata: Metadata = {
  title: "Submit a creep route",
  description:
    "Click camps on the map to build a Warcraft III creep route and share it. A coach reviews it and publishes it with your name on it.",
  robots: { index: false },
};

type Search = { map?: string };

export default async function SubmitCreepRoutePage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!CREEP_ROUTES_LIVE) notFound();
  const sp = await searchParams;
  const [maps, builds] = await Promise.all([getCreepMaps(), getBuilds()]);
  const defaultMapSlug = maps.some((m) => m.slug === sp.map) ? sp.map : maps[0]?.slug;

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
          submissionsOpen={canAcceptSubmissions()}
        />
      </Container>
    </>
  );
}
