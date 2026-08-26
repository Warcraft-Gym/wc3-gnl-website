import type { Metadata } from "next";
import { Trophy, Coins, Users } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface, SectionHead } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";
import { DataSourceNote } from "@/components/DataSourceNote";
import { FantasyStandings } from "@/components/league/FantasyStandings";
import { getActiveSeason, getFantasy } from "@/lib/api/gnl";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fantasy League",
  description:
    "Draft a fantasy team, place bets on series, and climb the fantasy standings.",
};

const STEPS = [
  {
    Icon: Users,
    title: "Draft your team",
    body: "Pick players and a drafted race before the season locks. Your squad scores as they win — your captain scores double.",
  },
  {
    Icon: Coins,
    title: "Place your bets",
    body: "Put fantasy points on the series you've called. Bench, team and race bonuses all stack onto your total.",
  },
  {
    Icon: Trophy,
    title: "Top the table",
    body: "Points accrue across the whole season. Beat your rivals in the fantasy standings.",
  },
];

export default async function FantasyPage() {
  const [season, { entries, source }] = await Promise.all([
    getActiveSeason(),
    getFantasy(),
  ]);

  const topScore = entries[0]?.total ?? 0;

  return (
    <>
      <PageHeader
        kicker={`${season.shortName} · Fantasy`}
        title="Fantasy League"
        lead="Managers draft a squad, back a captain, and bet on the series. Every win feeds the table below."
      />
      <Container className="py-10">
        <DataSourceNote source={source} />

        {/* summary strip */}
        <div className="mb-6 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
          {[
            { label: "Managers", value: entries.length },
            { label: "Top score", value: topScore },
            { label: "Season", value: season.shortName },
          ].map((s) => (
            <div key={s.label} className="bg-surface px-5 py-4">
              <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.18em] text-faint">
                {s.label}
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-fg">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <SectionHead
          kicker="The table"
          title="Fantasy standings"
          lead="Tap any manager to see their points breakdown and drafted squad."
        />
        <div className="mt-6">
          <FantasyStandings entries={entries} />
        </div>

        {/* how it works */}
        <div className="mt-14">
          <SectionHead kicker="How it works" title="Play the meta" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ Icon, title, body }) => (
              <Surface key={title} className="p-6">
                <span className="skew grid size-11 place-items-center bg-gold/10 text-gold">
                  <Icon
                    size={20}
                    className="[transform:skewX(calc(var(--wg-skew)*-1))]"
                  />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold uppercase text-fg">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </Surface>
            ))}
          </div>
          <div className="mt-8">
            <ButtonLink href="/dashboard" size="lg">
              Manage in the dashboard
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
