import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Map, Cog, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { GuideCard } from "@/components/learn/GuideCard";
import { LEARN_CATEGORIES, getCategory } from "@/lib/learn/data";
import { getGuidesByCategory } from "@/lib/learn/guides";

type Params = { params: Promise<{ category: string }> };

const TOPIC_ICON = {
  "new-players": Sparkles,
  "creep-routes": Map,
  mechanics: Cog,
} as const;

export function generateStaticParams() {
  return LEARN_CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategory(category);
  return {
    title: cat ? `${cat.title} — Learn` : "Learn",
    description: cat?.blurb,
  };
}

export default async function LearnCategoryPage({ params }: Params) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const guides = await getGuidesByCategory(cat.id);
  const TopicIcon =
    cat.kind === "topic"
      ? TOPIC_ICON[cat.id as keyof typeof TOPIC_ICON] ?? Sparkles
      : null;

  return (
    <>
      <PageHeader kicker="Learn" title={cat.title} lead={cat.blurb}>
        <div className="flex items-center gap-3">
          <span className="skew grid size-11 place-items-center bg-gold/10 text-gold">
            {cat.kind === "race" && cat.race ? (
              <RaceIcon race={cat.race} size={24} />
            ) : TopicIcon ? (
              <TopicIcon
                size={20}
                className="[transform:skewX(calc(var(--wg-skew)*-1))]"
              />
            ) : null}
          </span>
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> All topics
          </Link>
        </div>
      </PageHeader>

      <Container className="py-10">
        {guides.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        ) : (
          <p className="border border-dashed border-line px-5 py-10 text-center text-sm text-faint">
            Guides for this topic are on the way. Join the Discord to request one.
          </p>
        )}
      </Container>
    </>
  );
}
