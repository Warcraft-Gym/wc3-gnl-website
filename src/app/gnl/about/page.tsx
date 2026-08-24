import type { Metadata } from "next";
import { ArrowRight, Swords, GraduationCap, Users2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About the GNL",
  description:
    "The Gym Newbie League is a team league with solo matches, created by the Gym Discord community for new and veteran players alike — skill level doesn't matter.",
};

const BENEFITS = [
  {
    Icon: Swords,
    title: "Matched competition",
    body: "Captains draft balanced rosters so you're paired against opponents at your tier. Every week you get a competitive best-of-three that actually feels fair.",
  },
  {
    Icon: GraduationCap,
    title: "Captains & coaches",
    body: "Your captains and coaches are helpful people from the community — from seasoned veterans to semi-pros — who draft the team, share strategy, and help you improve.",
  },
  {
    Icon: Users2,
    title: "A team behind you",
    body: "Private team Discord channels for strategy talk, replay reviews, and camaraderie. You're never grinding alone — you've got a squad.",
  },
];

const STEPS = [
  {
    title: "Sign up",
    body: "Apply to join the season through the Gym Discord. Everyone is welcome — skill level does not matter.",
  },
  {
    title: "Get drafted",
    body: "Captains pick their rosters, building teams of players at a similar level.",
  },
  {
    title: "Train with your team",
    body: "Practice, review replays, and prep with your captain and teammates before the season starts.",
  },
  {
    title: "Play your weekly match",
    body: "Each week your team faces another team in a series of solo best-of-three matches.",
  },
  {
    title: "Earn points",
    body: "Results feed the standings — 4 points for a 2–0, 3 for a 2–1, and 1 even for a 1–2 loss.",
  },
  {
    title: "Improve — win or lose",
    body: "Every game gives you replays to study and teammates to learn from. Getting better is the whole point.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        kicker="Gym Newbie League"
        title="About the GNL"
        lead="A team league with solo matches, created by the Gym Discord community to give new and veteran players a competitive — and fun — place to compete."
      />

      <Container className="py-10">
        {/* Intro */}
        <div className="max-w-3xl space-y-5 text-[1.075rem] leading-8 text-muted">
          <p>
            The GNL is built for players between the grass/beginner leagues and
            roughly 1700–1800 MMR — anyone who wants organised, competitive games
            without stepping into the pro scene. If you&apos;re friendly, active in
            game and on Discord, there&apos;s a spot for you.
          </p>
          <p className="text-fg">
            Skill level does not matter. Showing up and wanting to improve does.
          </p>
        </div>

        {/* Why play */}
        <section className="mt-14">
          <p className="kicker mb-6">Why play</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {BENEFITS.map(({ Icon, title, body }) => (
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
        </section>

        {/* How it works */}
        <section className="mt-16">
          <p className="kicker mb-6">How a season works</p>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <Surface key={s.title} as="li" className="p-6">
                <span className="tnum font-display text-3xl font-extrabold text-gold/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold uppercase text-fg">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </Surface>
            ))}
          </ol>
        </section>

        {/* Cadence */}
        <section className="mt-16 max-w-3xl space-y-5 text-[1.075rem] leading-8 text-muted">
          <p className="kicker mb-2">Season cadence</p>
          <p>
            A season runs roughly six weeks, with a break of a few months between
            cycles. Between seasons the Gym Discord keeps going — volunteer
            coaching, practice, and a community of Warcraft III players to game
            with while you wait for the next draft.
          </p>
        </section>

        {/* CTA */}
        <div className="mt-14 flex flex-wrap gap-3">
          <ButtonLink href="https://discord.gg/7HUyQAKQ8p" size="lg">
            Join the Gym Discord <ArrowRight size={18} />
          </ButtonLink>
          <ButtonLink href="/gnl/rules" variant="outline" size="lg">
            Read the full rules
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
