import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Rivets } from "@/components/ui/Rivets";
import { KeyArt } from "@/components/ui/KeyArt";
import { Hero } from "@/components/home/Hero";
import { TrendingMatches } from "@/components/home/TrendingMatches";
import { NewsFeatureCard } from "@/components/home/NewsFeatureCard";
import { LadderPanel } from "@/components/home/LadderPanel";
import { TeamMedallions } from "@/components/home/TeamMedallions";
import {
  getActiveSeason,
  getStandings,
  getFixtures,
  getTeams,
  splitFixtures,
} from "@/lib/api/gnl";
import { getLatestPosts } from "@/lib/content";

export const dynamic = "force-dynamic";

/* Homepage composed as a stack of full-bleed painted sections separated by
 * riveted strips, mirroring the official Warcraft III page:
 * hero → "this week" (headline + panel) → news (feature cards) →
 * the ladder (edition-style panel) → teams (blue, medallions) → CTA. */
export default async function HomePage() {
  const [season, standings, fixtureData, teamData, posts] = await Promise.all([
    getActiveSeason(),
    getStandings(),
    getFixtures(),
    getTeams(),
    getLatestPosts(3),
  ]);

  const { live, upcoming, results } = splitFixtures(fixtureData.fixtures);

  return (
    <>
      <Hero
        season={season}
        stats={{
          teams: teamData.teams.length,
          players: teamData.teams.reduce((n, t) => n + t.players.length, 0),
          live: live.length,
        }}
      />

      <Rivets />

      {/* This week — headline left, matches panel right */}
      <section className="keyart">
        <KeyArt src="/keyart/section-sparks.jpg" overlay="none" />
        <Container className="relative z-10 grid grid-cols-[minmax(0,1fr)] items-center gap-10 py-[var(--wg-space-section)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-14">
          <div>
            <p className="kicker">Week {season.currentWeek}</p>
            <h2 className="mt-3 text-[length:var(--wg-text-display)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
              This week in the league
            </h2>
            <p className="mt-5 max-w-md text-lg text-muted">
              Live, upcoming and completed fixtures across the{" "}
              {season.shortName} season. Every series is a best-of-three —
              follow along or jump in.
            </p>
            <div className="mt-7">
              <ButtonLink href="/gnl/schedule" variant="outline" size="md">
                Full schedule <ArrowRight size={16} />
              </ButtonLink>
            </div>
          </div>
          <div className="panel p-4 sm:p-6">
            <TrendingMatches live={live} upcoming={upcoming} results={results} />
          </div>
        </Container>
      </section>

      <Rivets />

      {/* Latest news — centred heading + three feature cards */}
      <section className="keyart keyart-dark">
        <Container className="relative z-10 py-[var(--wg-space-section)]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[length:var(--wg-text-display)]">Latest news</h2>
            <p className="mt-4 text-lg text-muted">
              Recaps, roster moves, strategy guides and announcements from the
              Gym.
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

      {/* The ladder — edition-style panel */}
      <section className="keyart">
        <KeyArt src="/keyart/section-embers.jpg" position="center bottom" overlay="none" />
        <Container className="relative z-10 py-[var(--wg-space-section)]">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[length:var(--wg-text-display)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
              The ladder
            </h2>
          </div>
          <div className="mt-10">
            <LadderPanel season={season} rows={standings.rows.slice(0, 6)} />
          </div>
        </Container>
      </section>

      <Rivets />

      {/* Teams — blue atmosphere, medallion row */}
      <section className="keyart keyart-blue">
        <KeyArt
          src="/keyart/feature-night-elf.jpg"
          position="70% center"
          overlay="none"
          className="[mask-image:linear-gradient(90deg,transparent_0%,rgba(0,0,0,.55)_45%,black_100%)] opacity-70"
        />
        <Container className="relative z-10 py-[var(--wg-space-section)]">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-14">
            <div>
              <h2 className="text-[length:var(--wg-text-display)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
                Teams
              </h2>
              <p className="mt-5 max-w-sm text-lg text-muted">
                {teamData.teams.length} rosters drafted by captains for{" "}
                {season.shortName}. Pick a crest to see the players, their
                races, and every match they&apos;ve played.
              </p>
              <div className="mt-7">
                <ButtonLink href="/gnl/teams" variant="outline">
                  All teams <ArrowRight size={16} />
                </ButtonLink>
              </div>
            </div>
            <TeamMedallions teams={teamData.teams} />
          </div>
        </Container>
      </section>

      <Rivets />

      {/* CTA band */}
      <section className="keyart keyart-dark">
        <KeyArt src="/keyart/outro-battle.jpg" position="center 30%" overlay="strong" />
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
              Ready to climb?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
              The Gym Newbie League is built for improving players. Sign up,
              draft in, and play your first competitive season — no pressure,
              all growth.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/dashboard" size="lg">
                Join the league <ArrowRight size={18} />
              </ButtonLink>
              <ButtonLink
                href="/blog/newbie-guide-first-season"
                variant="outline"
                size="lg"
              >
                Read the newbie guide
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
