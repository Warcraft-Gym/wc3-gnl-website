import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHead } from "@/components/ui/Surface";
import { Hero } from "@/components/home/Hero";
import { TrendingMatches } from "@/components/home/TrendingMatches";
import { StandingsTable } from "@/components/league/StandingsTable";
import { TeamCard } from "@/components/league/TeamCard";
import { PostCard } from "@/components/blog/PostCard";
import {
  getActiveSeason,
  getStandings,
  getFixtures,
  getTeams,
  splitFixtures,
} from "@/lib/api/gnl";
import { getLatestPosts } from "@/lib/content";

export const dynamic = "force-dynamic";

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

      {/* Trending matches — tabbed */}
      <Container as="section" className="py-[var(--wg-space-section)]">
        <SectionHead
          kicker="On deck"
          title="Trending matches"
          lead="Live, upcoming and completed fixtures across the league."
          action={
            <ButtonLink href="/gnl/schedule" variant="outline" size="sm">
              Full schedule <ArrowRight size={15} />
            </ButtonLink>
          }
        />
        <div className="mt-8">
          <TrendingMatches live={live} upcoming={upcoming} results={results} />
        </div>
      </Container>

      {/* Standings + news */}
      <Container
        as="section"
        className="grid gap-12 pb-[var(--wg-space-section)] lg:grid-cols-[1.15fr_1fr]"
      >
        <div>
          <SectionHead
            kicker="The ladder"
            title="Standings"
            action={
              <ButtonLink href="/gnl/standings" variant="ghost" size="sm">
                Full table <ArrowRight size={15} />
              </ButtonLink>
            }
          />
          <div className="mt-6">
            <StandingsTable rows={standings.rows.slice(0, 6)} compact />
          </div>
        </div>

        <div>
          <SectionHead kicker="From the desk" title="Latest" />
          <div className="mt-6 flex flex-col gap-4">
            {posts.slice(0, 2).map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </div>
      </Container>

      {/* Teams */}
      <Container as="section" className="pb-[var(--wg-space-section)]">
        <SectionHead
          kicker="The roster"
          title={`Teams of ${season.shortName}`}
          action={
            <ButtonLink href="/gnl/teams" variant="outline" size="sm">
              All teams <ArrowRight size={15} />
            </ButtonLink>
          }
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {teamData.teams.slice(0, 4).map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      </Container>

      {/* CTA band */}
      <Container as="section" className="pb-[var(--wg-space-section)]">
        <div className="grain glow-gold relative overflow-hidden border border-gold/25 bg-gradient-to-br from-surface-2 to-surface p-10 sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(30rem 20rem at 90% 120%, var(--wg-gold-glow), transparent 60%)",
            }}
          />
          <div className="max-w-2xl">
            <h2 className="text-[length:var(--wg-text-display)] font-extrabold">
              Ready to climb?
            </h2>
            <p className="mt-4 text-lg normal-case text-muted">
              The Gym Newbie League is built for improving players. Sign up, draft
              in, and play your first competitive season — no pressure, all growth.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
        </div>
      </Container>
    </>
  );
}
