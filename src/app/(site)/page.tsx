import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Rivets } from "@/components/ui/Rivets";
import { KeyArt } from "@/components/ui/KeyArt";
import { Hero } from "@/components/home/Hero";
import { LearnRaces } from "@/components/home/LearnRaces";
import { CommunityTiles } from "@/components/home/CommunityTiles";
import { CommunityIntro } from "@/components/home/CommunityIntro";
import { NewsFeatureCard } from "@/components/home/NewsFeatureCard";
import { GnlSection } from "@/components/home/GnlSection";
import { BuildRow, FeaturedBuild } from "@/components/builds/BuildRow";
import { getBuilds } from "@/lib/builds/builds";
import { OVERLAY_BETA_LIVE } from "@/lib/flags";
import { getActiveSeason, getTeams } from "@/lib/api/gnl";
import { getLatestPosts } from "@/lib/content";
import { getDiscordCommunity } from "@/lib/discord";
import { DISCORD_URL } from "@/lib/links";
import { DiscordIcon } from "@/components/ui/DiscordIcon";

export const dynamic = "force-dynamic";

/* Homepage: the Gym is first a place to learn Warcraft III and hang out with
 * other players; the league is one of the things it runs. Stack of full-bleed
 * painted sections split by riveted strips:
 * hero → learn by race → build orders → community & fun →
 * news → the GNL (one compact section) → CTA. */
export default async function HomePage() {
  const [season, teamData, posts, community, builds] =
    await Promise.all([
      getActiveSeason(),
      getTeams(),
      getLatestPosts(3),
      getDiscordCommunity(),
      getBuilds(),
    ]);

  const featuredBuild = builds.find((b) => b.featured) ?? builds[0];
  const recentBuilds = builds.filter((b) => b.slug !== featuredBuild?.slug).slice(0, 3);

  return (
    <>
      <Hero />

      <Rivets />

      {/* Learn by race, blue "races" section */}
      <section className="keyart keyart-blue">
        <KeyArt
          src="/keyart/feature-night-elf.webp"
          position="70% center"
          overlay="soft"
          className="[mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,.55)_45%,black_100%)] opacity-80"
        />
        <Container className="relative z-10 py-[var(--wg-space-section)]">
          <LearnRaces />
        </Container>
      </section>

      <Rivets />

      {/* Build orders: the featured build plus the newest few */}
      {featuredBuild ? (
        <section className="keyart keyart-dark">
          <Container className="relative z-10 py-[var(--wg-space-section)]">
            <div className="mx-auto max-w-2xl text-center">
              <p className="kicker justify-center">Play along</p>
              <h2 className="mt-3 text-[length:var(--wg-text-display)]">Build orders</h2>
              <p className="mt-4 text-lg text-muted">
                Step-by-step build orders for every race and matchup, with food counts
                and a clock you can follow in your next game.
              </p>
            </div>
            <div className="mt-12">
              <FeaturedBuild build={featuredBuild} />
            </div>
            {recentBuilds.length ? (
              <ul className="mt-4 grid gap-2.5">
                {recentBuilds.map((b) => (
                  <BuildRow key={b.slug} build={b} />
                ))}
              </ul>
            ) : null}
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/learn/builds" size="lg">
                All build orders
              </ButtonLink>
              {OVERLAY_BETA_LIVE ? (
                <ButtonLink href="/tools/overlay" size="lg">
                  Get the overlay
                </ButtonLink>
              ) : null}
            </div>
          </Container>
        </section>
      ) : null}

      <Rivets />

      {/* Community & fun */}
      <section className="keyart">
        <KeyArt src="/keyart/section-sparks.webp" overlay="none" />
        <Container className="relative z-10 grid grid-cols-[minmax(0,1fr)] gap-10 py-[var(--wg-space-section)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-14">
          <CommunityIntro community={community} />
          <CommunityTiles />
        </Container>
      </section>

      <Rivets />

      {/* Latest news */}
      <section className="keyart keyart-dark">
        <Container className="relative z-10 py-[var(--wg-space-section)]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[length:var(--wg-text-display)]">Latest news</h2>
            <p className="mt-4 text-lg text-muted">
              Event announcements, replay of the month, season recaps and
              community stories from the Gym.
            </p>
          </div>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {posts.map((p, i) => (
              <NewsFeatureCard key={p.slug} post={p} index={i} />
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <ButtonLink href="/blog" size="lg">
              All news
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Rivets />

      {/* The GNL, one compact section */}
      <section className="keyart">
        <KeyArt
          src="/keyart/feature-orc-vs-human.webp"
          position="60% center"
          overlay="none"
          className="[mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,.5)_45%,black_100%)] opacity-55"
        />
        <Container className="relative z-10 py-[var(--wg-space-section)]">
          <GnlSection season={season} teams={teamData.teams} />
        </Container>
      </section>

      <Rivets />

      {/* CTA band */}
      <section className="keyart keyart-dark">
        <KeyArt src="/keyart/outro-battle.webp" position="center 30%" overlay="strong" />
        <Container className="relative z-10 py-[var(--wg-space-section)]">
          <div className="panel grain relative overflow-hidden p-8 text-center sm:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-70"
              style={{
                backgroundImage:
                  "radial-gradient(34rem 18rem at 50% 120%, var(--wg-gold-glow), transparent 65%)",
              }}
            />
            <p className="kicker justify-center">Open to everyone</p>
            <h2 className="mt-3 text-[length:var(--wg-text-display)]">
              Come join the Gym
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
              New to Warcraft III, back after years away, or grinding for the
              next season, there&apos;s a spot for you. Say hi on Discord and
              there&apos;s always someone up for a game, a replay review or
              the next community night.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href={DISCORD_URL} variant="discord" size="lg">
                <DiscordIcon size={20} /> Join the Discord
              </ButtonLink>
              <ButtonLink href="/learn" size="lg">
                Start learning
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
