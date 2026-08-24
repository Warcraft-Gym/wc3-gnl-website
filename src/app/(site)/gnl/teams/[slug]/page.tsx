import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { TeamPlate } from "@/components/league/VsBadge";
import { FixtureCard } from "@/components/league/FixtureCard";
import {
  getTeams,
  getTeamBySlug,
  getStandings,
  getFixtures,
} from "@/lib/api/gnl";
import { raceOf } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { teams } = await getTeams();
  return teams.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const team = await getTeamBySlug(slug);
  return {
    title: team ? team.name : "Team",
    description: team ? `${team.name} — roster and results.` : undefined,
  };
}

export default async function TeamPage({ params }: Params) {
  const { slug } = await params;
  const [team, { rows }, { fixtures }] = await Promise.all([
    getTeamBySlug(slug),
    getStandings(),
    getFixtures(),
  ]);

  if (!team) notFound();

  const standing = rows.find((r) => r.team.id === team.id);
  const teamFixtures = fixtures
    .filter((f) => f.home.id === team.id || f.away.id === team.id)
    .sort((a, b) => a.week - b.week);

  return (
    <>
      <div className="relative overflow-hidden border-b border-line/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(34rem 20rem at 90% -10%, var(--wg-gold-glow), transparent 60%)",
          }}
        />
        <Container className="py-12 sm:py-16">
          <Link
            href="/gnl/teams"
            className="mb-6 inline-flex items-center gap-1.5 text-sm uppercase tracking-wide text-muted transition-colors hover:text-gold"
          >
            <ArrowLeft size={15} /> All teams
          </Link>
          <div className="flex flex-wrap items-center gap-5">
            <TeamPlate
              tag={team.tag!}
              logoUrl={team.logoUrl}
              name={team.name}
              size="lg"
            />
            <div>
              <h1 className="text-[length:var(--wg-text-display)] font-extrabold">
                {team.name}
              </h1>
              {standing ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm uppercase tracking-wide text-muted">
                  <span>
                    Rank{" "}
                    <span className="tnum font-bold text-gold">
                      #{standing.rank}
                    </span>
                  </span>
                  <span className="tnum">
                    {standing.wins}W – {standing.losses}L
                  </span>
                  <span className="tnum">{standing.points} pts</span>
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </div>

      <Container className="grid gap-12 py-10 lg:grid-cols-[1fr_1.5fr]">
        <section>
          <h2 className="mb-5 font-display text-xl font-bold uppercase">Roster</h2>
          <Surface className="divide-y divide-line/60">
            {team.players.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-display font-bold uppercase text-fg">
                    {p.name}
                  </p>
                  <p className="mt-1 flex items-center gap-3 text-xs text-faint">
                    <RaceBadge race={raceOf(p.race)} />
                    {p.country ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {p.country}
                      </span>
                    ) : null}
                  </p>
                </div>
                {p.mmr ? (
                  <span className="tnum font-mono text-sm text-muted">
                    {p.mmr} MMR
                  </span>
                ) : null}
              </div>
            ))}
          </Surface>
        </section>

        <section>
          <h2 className="mb-5 font-display text-xl font-bold uppercase">
            Fixtures
          </h2>
          {teamFixtures.length ? (
            <div className="grid gap-4">
              {teamFixtures.map((f) => (
                <FixtureCard key={f.id} fixture={f} />
              ))}
            </div>
          ) : (
            <p className="border border-dashed border-line px-5 py-8 text-center text-sm text-faint">
              No fixtures recorded for this team yet.
            </p>
          )}
        </section>
      </Container>
    </>
  );
}
