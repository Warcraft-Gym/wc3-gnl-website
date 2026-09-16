import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PortableBody } from "@/components/sanity/PortableBody";
import { StepTable } from "@/components/builds/StepTable";
import { DifficultyBadge, Matchup, TagChip } from "@/components/builds/BuildBadges";
import { BuildRow } from "@/components/builds/BuildRow";
import { getBuildBySlug, getBuilds } from "@/lib/builds/builds";
import { BUILD_RACES } from "@/lib/builds/types";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const builds = await getBuilds();
  return builds.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const build = await getBuildBySlug(slug);
  if (!build) return { title: "Build not found" };
  const race = BUILD_RACES.find((r) => r.id === build.race)?.label;
  const title = `${build.title} — ${race} build order`;
  return {
    title,
    description: build.summary,
    openGraph: {
      title,
      description: build.summary,
      type: "article",
      images: [{ url: `/factions/headers/${build.race}.webp`, width: 1600, height: 700 }],
    },
  };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function isPortableText(v: unknown[]): v is Record<string, unknown>[] {
  return typeof v[0] === "object";
}

export default async function BuildPage({ params }: Params) {
  const { slug } = await params;
  const build = await getBuildBySlug(slug);
  if (!build) notFound();

  const related = (await getBuilds())
    .filter((b) => b.race === build.race && b.slug !== build.slug)
    .slice(0, 3);

  return (
    <article>
      {/* Masthead */}
      <div className="relative overflow-hidden border-b border-line/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-50"
          style={{ backgroundImage: "radial-gradient(34rem 20rem at 82% -20%, var(--wg-gold-glow), transparent 60%)" }}
        />
        <Container className="py-12 sm:py-16">
          <Link
            href="/learn/builds"
            className="inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> All builds
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Matchup race={build.race} vsRace={build.vsRace} size={22} />
            <DifficultyBadge level={build.difficulty} />
            {build.patch ? (
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">Patch {build.patch}</span>
            ) : null}
          </div>
          <h1 className="mt-4 max-w-3xl text-[length:var(--wg-text-display)]">{build.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">{build.summary}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
            <span>
              By <span className="text-muted">{build.author}</span>
              {build.authorDiscord ? <span className="text-faint"> ({build.authorDiscord})</span> : null}
            </span>
            {build.maintainer && build.maintainer !== build.author ? (
              <span>· Maintained by <span className="text-muted">{build.maintainer}</span></span>
            ) : null}
            <span>· Updated {formatDate(build.updatedAt)}</span>
            {build.sourceUrl ? (
              <a
                href={build.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-gold hover:underline"
              >
                Source <ExternalLink size={11} />
              </a>
            ) : null}
          </p>
          {build.tags.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {build.tags.map((t) => (
                <TagChip key={t}>{t}</TagChip>
              ))}
            </div>
          ) : null}
        </Container>
      </div>

      <Container className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
        {/* Description */}
        <section className="reading min-w-0 self-start p-5 sm:p-7">
          <h2 className="mb-4 text-[1.05rem] font-bold tracking-[0.06em]">About this build</h2>
          {build.description && build.description.length ? (
            isPortableText(build.description) ? (
              <div className="prose-invert max-w-none">
                <PortableBody value={build.description} />
              </div>
            ) : (
              <div className="space-y-4 text-[1.02rem] leading-7 text-muted">
                {(build.description as string[]).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-faint">No notes yet.</p>
          )}
        </section>

        {/* Steps */}
        <section className="min-w-0 lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)] lg:self-start">
          <StepTable steps={build.steps} />
        </section>
      </Container>

      {related.length ? (
        <Container className="pb-16">
          <h2 className="mb-4 text-[1.05rem] font-bold tracking-[0.06em]">
            More {BUILD_RACES.find((r) => r.id === build.race)?.label} builds
          </h2>
          <ul className="grid gap-3">
            {related.map((b) => (
              <BuildRow key={b.slug} build={b} />
            ))}
          </ul>
        </Container>
      ) : null}
    </article>
  );
}
