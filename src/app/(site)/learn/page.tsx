import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ListOrdered } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { SectionHead } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_URL } from "@/lib/links";
import { CategoryCard } from "@/components/learn/CategoryCard";
import { GuideCard } from "@/components/learn/GuideCard";
import { LEARN_CATEGORIES, getCategory } from "@/lib/learn/data";
import { getLatestGuides } from "@/lib/learn/guides";
import { learnArt } from "@/lib/learn/art";

export const metadata: Metadata = {
  title: "Learn Warcraft III",
  description:
    "Level up your Warcraft 3 skills, race guides, creep routes, game mechanics, and build orders for new and returning players.",
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

        {/* Categories */}
        <section className="mt-14">
          <SectionHead kicker="Browse" title="Guides by race &amp; topic" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>

          {/* Build orders, cross-race, so it sits under the category grid */}
          <Link
            href="/learn/builds"
            className="panel group mt-4 flex flex-col gap-4 p-5 transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-gold/30 bg-surface-2 text-gold">
                <ListOrdered size={22} />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold uppercase text-fg transition-colors group-hover:text-gold">
                  Build orders
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Timed openings for every race and matchup, with a play-along clock, and you can submit your own.
                </p>
              </div>
            </div>
            <span className="kicker shrink-0">Browse builds</span>
          </Link>
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
