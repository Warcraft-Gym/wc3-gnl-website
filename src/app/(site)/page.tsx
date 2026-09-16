import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Rivets } from "@/components/ui/Rivets";
import { KeyArt } from "@/components/ui/KeyArt";
import { Hero } from "@/components/home/Hero";
import { LearnRaces } from "@/components/home/LearnRaces";
import { GuideFeatureCard } from "@/components/home/GuideFeatureCard";
import { CommunityTiles } from "@/components/home/CommunityTiles";
import { CommunityIntro } from "@/components/home/CommunityIntro";
import { NewsFeatureCard } from "@/components/home/NewsFeatureCard";
import { GnlSection } from "@/components/home/GnlSection";
import { getActiveSeason, getStandings, getTeams } from "@/lib/api/gnl";
import { getGuides } from "@/lib/learn/guides";
import { getLatestPosts } from "@/lib/content";
import { getDiscordCommunity } from "@/lib/discord";
import { DISCORD_URL } from "@/lib/links";
import { DiscordIcon } from "@/components/ui/DiscordIcon";

export const dynamic = "force-dynamic";

/* Homepage: the Gym is first a place to learn Warcraft III and hang out with
 * other players; the league is one of the things it runs. Stack of full-bleed
 * painted sections split by riveted strips:
 * hero → learn by race → latest guides → community & fun → news →
 * the GNL (one compact section) → CTA. */
export default async function HomePage() {
  const [season, standings, teamData, guides, posts, community] =
    await Promise.all([
      getActiveSeason(),
      getStandings(),
      getTeams(),
      getGuides(),
      getLatestPosts(3),
      getDiscordCommunity(),
    ]);

  const latestGuides = [...guides]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);

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

      {/* Latest guides, centred heading + three feature cards */}
      <section className="keyart keyart-dark">
        <Container className="relative z-10 py-[var(--wg-space-section)]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker justify-center">Fresh from the coaches</p>
            <h2 className="mt-3 text-[length:var(--wg-text-display)]">
              Latest guides
            </h2>
            <p className="mt-4 text-lg text-muted">
              Build orders, matchup plans and mechanics explained by people who
              play them every week, from your first game to your first
              tournament.
            </p>
          </div>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {latestGuides.map((g, i) => (
              <GuideFeatureCard key={g.slug} guide={g} index={i} />
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <ButtonLink href="/learn" variant="outline">
              All guides <ArrowRight size={16} />
            </ButtonLink>
          </div>
        </Container>
      </section>

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
            <ButtonLink href="/blog" variant="outline">
              All news <ArrowRight size={16} />
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
          <GnlSection
            season={season}
            rows={standings.rows.slice(0, 5)}
            teams={teamData.teams}
          />
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
              <ButtonLink href="/learn/new-players" variant="outline" size="lg">
                Start learning <ArrowRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
