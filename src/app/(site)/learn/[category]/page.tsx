import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { GuideCard } from "@/components/learn/GuideCard";
import { LEARN_CATEGORIES, getCategory } from "@/lib/learn/data";
import { learnArt, learnHeaderArt } from "@/lib/learn/art";
import { getGuideBySlug, getGuidesByCategory } from "@/lib/learn/guides";
import { PortableBody } from "@/components/sanity/PortableBody";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { filterBuilds, getBuilds } from "@/lib/builds/builds";
import { BuildRow } from "@/components/builds/BuildRow";
import { ButtonLink } from "@/components/ui/Button";

type Params = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return LEARN_CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return { title: "Learn" };
  const title = cat.kind === "race" ? `${cat.title} guides and build orders` : `${cat.title} guides`;
  return {
    title,
    description: `${cat.blurb} Free Warcraft III ${cat.title} guides from the Gym coaches.`,
    alternates: { canonical: `/learn/${cat.id}` },
    openGraph: { title: `${title} · Warcraft 3 Gym`, description: cat.blurb, url: `/learn/${cat.id}` },
  };
}

export default async function LearnCategoryPage({ params }: Params) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  // A category can lead with one guide in full (the new-player handbook);
  // the rest of its guides follow as cards.
  const featured = cat.featuredGuide ? await getGuideBySlug(cat.featuredGuide) : undefined;
  const guides = (await getGuidesByCategory(cat.id)).filter((g) => g.slug !== featured?.slug);
  // Race pages also surface that race's build orders, pre-filtered.
  const race = cat.kind === "race" && cat.race && cat.race !== "random" ? cat.race : undefined;
  const builds = race ? filterBuilds(await getBuilds(), { race }).slice(0, 4) : [];
  const buildsHref = race ? `/learn/builds?race=${race}` : "/learn/builds";

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Learn", path: "/learn" },
          { name: cat.title, path: `/learn/${cat.id}` },
        ])}
      />
      <PageHeader
        kicker="Learn"
        title={cat.title}
        lead={cat.blurb}
        art={learnArt(cat)}
        background={learnHeaderArt(cat)}
        backgroundPosition="center 30%"
      >
        {race ? (
          <ButtonLink href={buildsHref} size="sm">
            {cat.title} build orders <ArrowRight size={14} />
          </ButtonLink>
        ) : null}
      </PageHeader>

      {featured?.body?.length ? (
        <Container className="max-w-3xl pt-12">
          <article>
            <p className="kicker">{featured.title}</p>
            <p className="mt-2 text-lg text-muted">{featured.excerpt}</p>
            <p className="mt-3 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-faint">
              {featured.minutes} min read
            </p>
            <div className="mt-8">
              <PortableBody value={featured.body} />
            </div>
          </article>
        </Container>
      ) : null}

      <Container className="py-10">
        {featured && guides.length ? (
          <div className="mt-6 mb-6 border-t border-line/60 pt-10">
            <p className="kicker">More for new players</p>
            <h2 className="mt-2 text-[length:var(--wg-text-title)]">Shorter reads</h2>
          </div>
        ) : null}
        {guides.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        ) : featured ? null : (
          <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            Guides for this topic are on the way. Join the Discord to request one.
          </p>
        )}

        {race ? (
          <section className="mt-14">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="kicker">Build orders</p>
                <h2 className="mt-2 text-[length:var(--wg-text-title)]">{cat.title} openings</h2>
                <p className="mt-2 max-w-xl text-sm text-muted">
                  Timed step-by-step builds with a play-along clock. Pick one and follow it in your next game.
                </p>
              </div>
              <ButtonLink href={buildsHref} variant="outline" size="sm" className="shrink-0">
                All {cat.title} builds <ArrowRight size={14} />
              </ButtonLink>
            </div>
            {builds.length ? (
              <ul className="mt-6 grid gap-2.5">
                {builds.map((b) => (
                  <BuildRow key={b.slug} build={b} />
                ))}
              </ul>
            ) : (
              <div className="mt-6 rounded border border-dashed border-line px-5 py-8 text-center text-sm text-faint">
                No {cat.title} builds yet.{" "}
                <Link href="/learn/builds/submit" className="text-gold hover:underline">
                  Be the first to add one
                </Link>
                .
              </div>
            )}
          </section>
        ) : null}
      </Container>
    </>
  );
}
