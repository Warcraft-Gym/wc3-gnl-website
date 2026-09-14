import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { SectionHead } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryCard } from "@/components/learn/CategoryCard";
import { GuideCard } from "@/components/learn/GuideCard";
import { LEARN_CATEGORIES, getCategory } from "@/lib/learn/data";
import { getLatestGuides } from "@/lib/learn/guides";

export const metadata: Metadata = {
  title: "Learn Warcraft III",
  description:
    "Level up your Warcraft 3 skills — race guides, creep routes, game mechanics, and build orders for new and returning players.",
};

export default async function LearnPage() {
  const newPlayers = getCategory("new-players")!;
  const categories = LEARN_CATEGORIES.filter((c) => c.id !== "new-players");
  const latest = await getLatestGuides(6);

  return (
    <>
      <PageHeader
        kicker="Learn"
        title="Level up your Warcraft III"
        lead="Guides, build orders, and fundamentals for every race — whether you just installed the game or you're grinding for the next GNL season."
      />

      <Container className="py-10">
        {/* New & returning players — featured entry */}
        <Surface className="grain relative overflow-hidden border-gold/25 p-8 sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(28rem 18rem at 88% 120%, var(--wg-gold-glow), transparent 60%)",
            }}
          />
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <span className="kicker mb-3">Start here</span>
              <h2 className="flex items-center gap-3 text-[length:var(--wg-text-title)]">
                <GraduationCap className="text-gold" size={30} />
                New &amp; returning players
              </h2>
              <p className="mt-3 normal-case text-muted">{newPlayers.blurb} Pick a
                race, learn one opening, and get your first games in without the
                overwhelm.
              </p>
            </div>
            <ButtonLink href="/learn/new-players" size="lg" className="shrink-0">
              Start learning <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </Surface>

        {/* Categories */}
        <section className="mt-14">
          <SectionHead kicker="Browse" title="Guides by race &amp; topic" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        </section>

        {/* Latest guides */}
        <section className="mt-16">
          <SectionHead
            kicker="Fresh"
            title="Latest guides"
            action={
              <Link
                href="/learn/new-players"
                className="hidden text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold sm:inline"
              >
                Browse all
              </Link>
            }
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </section>

        {/* Coaching CTA */}
        <Surface className="mt-16 flex flex-col gap-5 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold uppercase">
              Want feedback on your play?
            </h2>
            <p className="mt-2 text-muted">
              The Gym Discord has volunteer coaches who review replays and help you
              improve — for free, at every level.
            </p>
          </div>
          <ButtonLink
            href="https://discord.gg/7HUyQAKQ8p"
            size="lg"
            className="shrink-0"
          >
            Join the Discord <ArrowRight size={18} />
          </ButtonLink>
        </Surface>
      </Container>
    </>
  );
}
