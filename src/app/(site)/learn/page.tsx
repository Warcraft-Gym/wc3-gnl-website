import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { SectionHead } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_URL } from "@/lib/links";
import { CategoryCard } from "@/components/learn/CategoryCard";
import { GuideCard } from "@/components/learn/GuideCard";
import { LEARN_CATEGORIES, getCategory, type LearnCategory } from "@/lib/learn/data";
import { getLatestGuides } from "@/lib/learn/guides";
import { learnArt } from "@/lib/learn/art";

export const metadata: Metadata = {
  title: "Learn Warcraft III: guides for every race",
  description:
    "Free Warcraft III guides: Human, Orc, Night Elf and Undead strategy, creep routes, game mechanics and build orders for new and returning players.",
  alternates: { canonical: "/learn" },
};

export default async function LearnPage() {
  const newPlayers = getCategory("new-players")!;
  const races = LEARN_CATEGORIES.filter((c) => c.kind === "race");
  const topics = LEARN_CATEGORIES.filter((c) => c.kind === "topic" && c.id !== "new-players");
  // Build orders live at /learn/builds but belong with the topics here.
  const buildOrders: LearnCategory = {
    id: "mechanics",
    title: "Build orders",
    blurb: "Timed openings for every race and matchup, with a play-along clock. Submit your own.",
    kind: "topic",
  };
  const latest = await getLatestGuides(6);

  return (
    <>
      <PageHeader
        kicker="Learn"
        title="Level up your Warcraft III"
        lead="Guides, build orders, and fundamentals for every race, whether you just installed the game or you're grinding for the next GNL season."
      />

      <Container className="py-10">
        {/* New & returning players, featured entry */}
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
            <div className="flex max-w-3xl flex-col gap-5 sm:flex-row sm:items-center">
              <span className="relative block size-28 shrink-0 sm:size-32">
                <span
                  aria-hidden
                  className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-60 blur-xl"
                />
                <Image
                  src={learnArt(newPlayers) ?? ""}
                  alt=""
                  fill
                  priority
                  sizes="128px"
                  className="object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,.85)]"
                />
              </span>
              <div>
              <span className="kicker mb-3">Start here</span>
              <h2 className="text-[length:var(--wg-text-title)]">
                New &amp; returning players
              </h2>
              <p className="mt-3 normal-case text-muted">{newPlayers.blurb} Pick a
                race, learn one opening, and get your first games in without the
                overwhelm.
              </p>
              </div>
            </div>
            <ButtonLink href="/learn/new-players" size="lg" className="shrink-0">
              Start learning <ArrowRight size={18} />
            </ButtonLink>
          </div>
        </Surface>

        {/* Categories: races in one row, topics in the next */}
        <section className="mt-14">
          <SectionHead kicker="Browse" title="Guides by race &amp; topic" />
          <p className="kicker mt-8 mb-4">By race</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {races.map((c) => (
              <CategoryCard key={c.id} category={c} stacked />
            ))}
          </div>
          <p className="kicker mt-10 mb-4">By topic</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
            <CategoryCard category={buildOrders} href="/learn/builds" art="/graphics/build-orders-2.webp" />
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
              improve, for free, at every level.
            </p>
          </div>
          <ButtonLink
            href={DISCORD_URL}
            variant="discord"
            size="lg"
            className="shrink-0"
          >
            <DiscordIcon size={20} /> Join the Discord
          </ButtonLink>
        </Surface>
      </Container>
    </>
  );
}
