import type { Metadata } from "next";
import { CalendarClock, Trophy, Swords, Upload } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Player Dashboard",
  description:
    "Set your availability, self-schedule series, report results and manage your fantasy team.",
};

const FEATURES = [
  {
    Icon: CalendarClock,
    title: "Set availability & self-schedule",
    body: "Mark the windows you can play and lock in series times with your opponent — no admin ping required.",
  },
  {
    Icon: Upload,
    title: "Report results & upload replays",
    body: "Drop your replays, enter the score, and standings update automatically the moment both players confirm.",
  },
  {
    Icon: Trophy,
    title: "Manage your fantasy team",
    body: "Draft players, place bets on series, and track your fantasy points across the season.",
  },
  {
    Icon: Swords,
    title: "Your series & stats",
    body: "See your upcoming matches, past results, and personal stats — all in one place.",
  },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        kicker="Players"
        title="Player Dashboard"
        lead="The self-service home for competitors. Sign in through Discord to schedule matches, report results, and run your fantasy team."
      >
        <Badge tone="arcane">Coming in the next milestone</Badge>
      </PageHeader>

      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ Icon, title, body }) => (
            <Surface key={title} className="p-6">
              <span className="grid size-11 place-items-center rounded-lg border border-gold/30 bg-surface-2 text-gold">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-fg">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted">{body}</p>
            </Surface>
          ))}
        </div>

        <Surface className="mt-8 p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold">How sign-in will work</h2>
          <p className="mt-3 max-w-2xl text-muted">
            The Gym already issues one-time access tokens through its Discord bot.
            The dashboard will build on that same flow: request a login link in
            Discord, click through, and you&apos;re authenticated — no extra
            password to manage. Session handling and the scheduling UI land in the
            next milestone.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="https://discord.gg/7HUyQAKQ8p" size="md">
              Join the Discord
            </ButtonLink>
            <ButtonLink href="/gnl/schedule" variant="outline" size="md">
              See the current schedule
            </ButtonLink>
          </div>
        </Surface>
      </Container>
    </>
  );
}
