import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { KeyArt } from "@/components/ui/KeyArt";
import { ButtonLink } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_BUILDS_CHANNEL_URL } from "@/lib/links";
import { PortableBody } from "@/components/sanity/PortableBody";
import { StepTable } from "@/components/builds/StepTable";
import { DifficultyBadge, Matchup, TagChip } from "@/components/builds/BuildBadges";
import { BuildRow } from "@/components/builds/BuildRow";
import { OverlayBeta } from "@/components/builds/OverlayBeta";
import { OVERLAY_BETA_LIVE } from "@/lib/flags";
import { getBuildBySlug, getBuilds } from "@/lib/builds/builds";
import { BUILD_RACES, vsLabel } from "@/lib/builds/types";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, howToJsonLd } from "@/lib/seo";

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
  const vs = build.vsRaces.length ? ` vs ${vsLabel(build.vsRaces)}` : "";
  const title = `${build.title}: ${race}${vs} build order`;
  return {
    title,
    description: build.summary,
    alternates: { canonical: `/learn/builds/${build.slug}` },
    openGraph: {
      title,
      description: build.summary,
      type: "article",
      url: `/learn/builds/${build.slug}`,
      publishedTime: build.publishedAt,
      modifiedTime: build.updatedAt,
      authors: [build.author],
      images: [{ url: `/factions/headers/${build.race}.webp`, width: 1600, height: 700 }],
    },
    twitter: { card: "summary_large_image", title, description: build.summary },
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
      <JsonLd
        data={howToJsonLd({
          path: `/learn/builds/${build.slug}`,
          title: build.title,
          description: build.summary,
          author: build.author,
          publishedAt: build.publishedAt,
          modifiedAt: build.updatedAt,
          steps: build.steps,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Learn", path: "/learn" },
          { name: "Build orders", path: "/learn/builds" },
          { name: build.title, path: `/learn/builds/${build.slug}` },
        ])}
      />
      {/* Masthead: the race showcase runs under the nav bar, like the Learn race pages */}
      <div className="keyart -mt-[var(--wg-chrome-h,var(--wg-header-h))]">
        <KeyArt src={`/factions/headers/${build.race}.webp`} position="center 30%" overlay="soft" priority />
        {/* Left-weighted vignette so the title and meta read over the art */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(0,0,0,.8)_0%,rgba(0,0,0,.55)_45%,rgba(0,0,0,.15)_100%)]"
        />
        <Container className="relative z-10 pb-12 pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+2.5rem)] sm:pb-16 sm:pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+3.5rem)]">
          <Link
            href="/learn/builds"
            className="inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> All builds
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Matchup race={build.race} vsRaces={build.vsRaces} size={22} />
            <DifficultyBadge level={build.difficulty} />
            {build.patch ? (
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">Patch {build.patch}</span>
            ) : null}
          </div>
          <h1 className="mt-4 max-w-4xl text-[length:var(--wg-text-display)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
            {build.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted [text-shadow:0_1px_12px_rgba(0,0,0,.8)]">{build.summary}</p>
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
        <div className="rivets relative z-10" aria-hidden />
      </div>

      <Container className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
        {/* Description */}
        <section className="min-w-0">
          <h2 className="mb-4 text-[1.05rem] font-bold tracking-[0.06em]">About this build</h2>
          {build.guide ? (
            <Link
              href={`/learn/guide/${build.guide.slug}`}
              className="mb-5 flex items-center gap-3 rounded border border-gold/40 bg-gold/5 px-4 py-3 text-sm transition-colors hover:border-gold hover:bg-gold/10"
            >
              <BookOpen size={18} className="shrink-0 text-gold" />
              <span className="min-w-0">
                <span className="block font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gold">Full guide</span>
                <span className="block truncate text-fg">{build.guide.title}</span>
              </span>
            </Link>
          ) : null}
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
          )}        </section>

        {/* Steps */}
        <section className="min-w-0 lg:sticky lg:top-[calc(var(--wg-header-h)+1rem)] lg:self-start">
          <StepTable steps={build.steps} />

          {OVERLAY_BETA_LIVE ? (
            <OverlayBeta
              className="mt-4"
              text="The desktop overlay floats these steps over Warcraft III while you play, clock included."
            />
          ) : null}

          {/* Questions go to the build orders channel */}
          <div className="panel mt-4 flex flex-col items-start gap-4 border-[#5865F2]/40 p-5">
            <div>
              <p className="whitespace-nowrap font-display text-[0.85rem] font-bold uppercase tracking-[0.08em] text-fg">
                Questions about this build?
              </p>
              <p className="mt-1 text-sm text-muted">
                Drop it in the build orders channel on the Gym Discord and a coach, or the author, will answer.
              </p>
            </div>
            <ButtonLink
              href={DISCORD_BUILDS_CHANNEL_URL}
              variant="discord"
              size="sm"
              target="_blank"
              rel="noreferrer"
            >
              <DiscordIcon size={15} /> Discuss on Discord
            </ButtonLink>
          </div>
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
