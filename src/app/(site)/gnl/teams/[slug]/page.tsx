import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Surface } from "@/components/ui/Surface";
import { RaceBadge } from "@/components/ui/Badge";
import { TeamPlate } from "@/components/league/VsBadge";
import { FixtureCard } from "@/components/league/FixtureCard";
import { CaptainBadge } from "@/components/league/CaptainBadge";
import { SeasonSwitcher } from "@/components/league/SeasonSwitcher";
import { getTeamPage } from "@/lib/api/gnl";
import { record } from "@/lib/figures.mjs";
import { parseSeasonParam as parseSeason, withSeason, type SeasonSearchParams } from "@/lib/api/season-params";
import { raceOf } from "@/lib/utils";

// Reads ?season= and the live backend, so it renders per request like the
// other league pages.
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SeasonSearchParams>;
};

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const [{ slug }, { season }] = await Promise.all([params, searchParams]);
  const data = await getTeamPage(slug, parseSeason(season));
  if (!data) return { title: "Team" };
  const { team } = data;
  return {
    title: `${team.name}, ${data.season.shortName} team`,
    description: `${team.name} in the Gym Newbie League ${data.season.shortName}: roster, captain, results and series.`,
    // One canonical per team: the newest season's page.
    alternates: { canonical: `/gnl/teams/${team.slug}` },
  };
}

export default async function TeamPage({ params, searchParams }: Params) {
  const [{ slug }, { season: seasonParam }] = await Promise.all([params, searchParams]);
  const data = await getTeamPage(slug, parseSeason(seasonParam));
  if (!data) notFound();
  const { team, season, seasons, standing, fixtures: teamFixtures } = data;

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
              <p className="kicker">{season.shortName}{seasons.length > 1 ? ` · ${seasons.length} seasons` : ""}</p>
              <h1 className="mt-1 text-[length:var(--wg-text-display)] font-extrabold">
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
                    {record(standing.wins, standing.losses, standing.draws) ?? "—"}
                  </span>
                  <span className="tnum">{standing.points} pts</span>
                </p>
              ) : null}
              {team.captains.length ? (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <CaptainBadge />
                  {team.captains.map((c, i) => (
                    <span key={c.id} className="inline-flex items-center gap-1.5 text-fg">
                      {i > 0 ? <span className="text-faint">&amp;</span> : null}
                      <RaceBadge race={raceOf(c.race)} showLabel={false} />
                      <Link href={`/gnl/players/${c.slug}`} className="transition-colors hover:text-gold">
                        {c.name}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          </div>
          {seasons.length > 1 ? (
            <div className="mt-8">
              <SeasonSwitcher seasons={seasons} active={season.number} href={(n) => withSeason(`/gnl/teams/${team.slug}`, n === seasons[0].number ? undefined : n)} />
            </div>
          ) : null}
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
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-display font-bold uppercase text-fg">
                    <Link href={`/gnl/players/${p.slug}`} className="transition-colors hover:text-gold">
                      {p.name}
                    </Link>
                    {p.isCaptain ? <CaptainBadge /> : null}
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
                <span className="shrink-0 text-right" title="Current W3Champions MMR">
                  {p.mmr ? (
                    <>
                      <span className="tnum block font-mono text-sm text-fg">{p.mmr}</span>
                      <span className="block font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">W3C MMR</span>
                    </>
                  ) : (
                    <span className="font-mono text-xs text-faint">No MMR</span>
                  )}
                </span>
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
              No fixtures recorded for this team in {season.shortName}.
            </p>
          )}
        </section>
      </Container>
    </>
  );
}
