import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ListOrdered } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PortableBody } from "@/components/sanity/PortableBody";
import { urlFor } from "@/sanity/image";
import { GuideCard } from "@/components/learn/GuideCard";
import { getCategory } from "@/lib/learn/data";
import { getGuides, getGuideBySlug } from "@/lib/learn/guides";
import { getBuildsForGuide } from "@/lib/builds/builds";
import { BuildRow } from "@/components/builds/BuildRow";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

const LEVEL_TONE = {
  beginner: "border-win/50 text-win",
  intermediate: "border-arcane/50 text-arcane",
  advanced: "border-gold/50 text-gold",
} as const;

export async function generateStaticParams() {
  const guides = await getGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return { title: "Guide not found" };
  const category = getCategory(guide.category);
  const image = guide.coverImage
    ? urlFor(guide.coverImage).width(1200).height(630).fit("crop").auto("format").url()
    : undefined;
  return {
    title: category ? `${guide.title} (${category.title} guide)` : guide.title,
    description: guide.excerpt,
    alternates: { canonical: `/learn/guide/${guide.slug}` },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.excerpt,
      url: `/learn/guide/${guide.slug}`,
      publishedTime: guide.publishedAt,
      section: category?.title,
      ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
    },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.excerpt },
  };
}

export default async function GuidePage({ params }: Params) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) notFound();

  const category = getCategory(guide.category);
  // Builds transcribed from this guide get a play-along table of their own.
  const builds = await getBuildsForGuide(guide.slug);
  const related = (await getGuides())
    .filter((g) => g.category === guide.category && g.slug !== guide.slug)
    .slice(0, 3);

  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(guide.publishedAt));

  const coverUrl = guide.coverImage
    ? urlFor(guide.coverImage).width(1400).fit("max").auto("format").url()
    : undefined;

  return (
    <article>
      <JsonLd
        data={articleJsonLd({
          path: `/learn/guide/${guide.slug}`,
          title: guide.title,
          description: guide.excerpt,
          publishedAt: guide.publishedAt,
          image: coverUrl,
          section: category?.title,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Learn", path: "/learn" },
          ...(category ? [{ name: category.title, path: `/learn/${category.id}` }] : []),
          { name: guide.title, path: `/learn/guide/${guide.slug}` },
        ])}
      />
      <div className="relative overflow-hidden border-b border-line/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(34rem 20rem at 82% -20%, var(--wg-gold-glow), transparent 60%)",
          }}
        />
        <Container className="max-w-3xl py-14 sm:py-20">
          <Link
            href={category ? `/learn/${category.id}` : "/learn"}
            className="mb-6 inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> {category ? category.title : "Learn"}
          </Link>
          <div className="mb-4 flex items-center gap-2 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em]">
            <span className={cn("border px-1.5 py-0.5", LEVEL_TONE[guide.level])}>
              {guide.level}
            </span>
            <span className="text-faint">{date}</span>
          </div>
          <h1 className={cn("font-extrabold", guide.title.length > 26 ? "text-[length:clamp(1.9rem,1rem+2.4vw,2.9rem)]" : "text-[length:var(--wg-text-display)]")}>
            {guide.title}
          </h1>
          <p className="mt-5 text-lg text-muted">{guide.excerpt}</p>
          <p className="mt-6 text-sm text-faint">{guide.minutes} min read</p>
        </Container>
      </div>

      {guide.coverImage ? (
        <Container className="max-w-3xl pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlFor(guide.coverImage).width(1400).fit("max").auto("format").url()}
            alt=""
            className="h-auto w-full border border-line bg-surface"
          />
        </Container>
      ) : null}

      {builds.length ? (
        <Container className="max-w-3xl pt-10">
          <p className="kicker mb-3 flex items-center gap-2">
            <ListOrdered size={14} /> Play-along build order
          </p>
          <ul className="grid gap-2.5">
            {builds.map((b) => (
              <BuildRow key={b.slug} build={b} />
            ))}
          </ul>
        </Container>
      ) : null}

      <Container className="max-w-3xl py-12">
        {guide.body?.length ? (
          <PortableBody value={guide.body} />
        ) : (
          <div className="space-y-5 text-[1.075rem] leading-8 text-muted [&_strong]:text-fg">
            {guide.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}
      </Container>

      {related.length ? (
        <Container className="max-w-5xl border-t border-line/60 py-14">
          <p className="kicker mb-6">More {category?.title} guides</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </Container>
      ) : null}
    </article>
  );
}
