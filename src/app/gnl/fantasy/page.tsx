import type { Metadata } from "next";
import { Trophy, Coins, Users } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Fantasy League",
  description:
    "Draft a fantasy team, place bets on series, and climb the fantasy standings.",
};

const STEPS = [
  {
    Icon: Users,
    title: "Draft your team",
    body: "Pick players and a drafted race before the season locks. Your fantasy squad scores as they win.",
  },
  {
    Icon: Coins,
    title: "Place your bets",
    body: "Put fantasy points on the series you think you've called. Bigger risk, bigger climb.",
  },
  {
    Icon: Trophy,
    title: "Top the table",
    body: "Points accrue across the whole season. Beat your rivals in the fantasy standings.",
  },
];

export default function FantasyPage() {
  return (
    <>
      <PageHeader kicker="GNL 18 · Fantasy" title="Fantasy League">
        <Badge tone="arcane">Wiring to the backend fantasy API</Badge>
      </PageHeader>
      <Container className="py-10">
        <p className="mb-8 max-w-2xl text-lg text-muted">
          The backend already runs fantasy teams and bets. This page will surface
          the live fantasy standings and let you manage your squad from the player
          dashboard.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ Icon, title, body }) => (
            <Surface key={title} className="p-6">
              <span className="skew grid size-11 place-items-center bg-gold/10 text-gold">
                <Icon size={20} className="[transform:skewX(calc(var(--wg-skew)*-1))]" />
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
      </Container>
    </>
  );
}
