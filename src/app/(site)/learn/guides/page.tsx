import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { GuideCard } from "@/components/learn/GuideCard";
import { LEARN_CATEGORIES } from "@/lib/learn/data";
import { getGuides } from "@/lib/learn/guides";

/**
 * Every guide on the site, in one page.
 *
 * `/learn` is the hub — crests, topics, and the six newest guides — and each
 * category page lists its own. Until this existed there was no way to see the
 * whole library: a reader who wanted "what else is there?" had to visit seven
 * category pages and add them up. That is also why the Learn page's "Browse
 * all" had nowhere to point.
 *
 * Grouped by category rather than one long date-sorted wall, because the
 * categories are how people actually look for a guide ("something for Undead"),
 * and a flat list of sixty is a worse answer than seven short ones. The static
 * segment wins over `[category]`, so `/learn/guides` never resolves as a
 * category slug.
 */
export const metadata: Metadata = {
  title: "All Warcraft III guides",
  description:
    "Every guide on Warcraft 3 Gym: Human, Orc, Night Elf and Undead strategy, creep routes, game mechanics and guides for new players.",
  alternates: { canonical: "/learn/guides" },
};

export default async function AllGuidesPage() {
  const guides = await getGuides();

  // Category order comes from LEARN_CATEGORIES, so this page reads in the same
  // order as the cards on /learn. A category with nothing published is skipped
  // rather than rendered as an empty heading.
  const sections = LEARN_CATEGORIES.map((category) => ({
    category,
    guides: guides.filter((g) => g.category === category.id),
  })).filter((s) => s.guides.length > 0);

  const counted = sections.reduce((n, s) => n + s.guides.length, 0);

  return (
    <>
      <PageHeader
        kicker="Learn"
        title="All guides"
        lead={`Every guide on the site — ${counted} of them — grouped by race and topic.`}
      />

      <Container className="py-10">
        {sections.map(({ category, guides: list }, i) => (
          <section key={category.id} className={i === 0 ? "" : "mt-14"}>
            <div className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-3">
              <h2 className="font-display text-xl font-bold uppercase tracking-[0.04em] text-fg">
                {category.title}
                <span className="ml-3 align-middle font-sans text-sm font-normal normal-case tracking-normal text-faint">
                  {list.length} {list.length === 1 ? "guide" : "guides"}
                </span>
              </h2>
              <Link
                href={`/learn/${category.id}`}
                className="group shrink-0 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
              >
                Open{" "}
                <ArrowRight size={14} className="inline align-[-2px] transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((g) => (
                <GuideCard key={g.slug} guide={g} />
              ))}
            </div>
          </section>
        ))}
      </Container>
    </>
  );
}
