import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake, MessagesSquare, Swords } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { ButtonLink } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_URL } from "@/lib/links";
import { getDiscordCommunity } from "@/lib/discord";

export const metadata: Metadata = {
  title: "About the Gym",
  description:
    "Warcraft 3 Gym is a Discord community founded in 2017 where players of every skill level come together to learn Warcraft III, get better and have fun.",
  alternates: { canonical: "/about" },
};

const PILLARS = [
  {
    Icon: MessagesSquare,
    title: "Always someone around",
    body: "Players from every corner of the globe, so the server is almost always active. Ask a question, share a replay, or find a practice partner at any hour.",
  },
  {
    Icon: Swords,
    title: "Built for melee, open to all",
    body: "1v1, 2v2, 3v3 and 4v4 are the focus, with a channel for every race, a looking-for-game channel, a replay channel and voice rooms. Custom game fans are welcome too.",
  },
  {
    Icon: HeartHandshake,
    title: "Friendly, respectful, welcoming",
    body: "We work hard to keep the Gym free of toxicity. Everyone here wants to help each other become a better player. Roasting dummies is allowed, between friends.",
  },
];

const fmt = new Intl.NumberFormat("en-US");

export default async function AboutGymPage() {
  const community = await getDiscordCommunity();

  return (
    <>
      <PageHeader
        kicker="Warcraft 3 Gym"
        title="About the Gym"
        lead="A Discord community where players of every skill level come together to learn Warcraft III, get better and have fun doing it."
        background="/graphics/gym-community.webp"
        backgroundPosition="center 80%"
      />

      <Container className="py-10">
        <div className="max-w-3xl space-y-5 text-[1.075rem] leading-8 text-muted [&_strong]:text-fg lg:max-w-none lg:columns-2 lg:gap-14 lg:space-y-0 [&>p]:break-inside-avoid lg:[&>p]:mb-5">
          <p>
            Warcraft 3 Gym began as a Discord server where players of all skill levels and
            experience could come together, learn to play and get better. The original goal was
            to give brand new players a place to grow, in confidence and in skill, and become a
            better player. It has since become a home for <strong>all</strong> players to train
            together, though we still hold new players&apos; concerns close to our heart.
            Warcraft III is a long-established game with a massive amount of depth, but at the end
            of the day we all started somewhere and were brand new to the game once.
          </p>
          <p>
            The server was founded in 2017 and has grown to thousands of members. Here&apos;s to
            thousands more. It is a great place to hang out, ask questions, get feedback on your
            replays, have a veteran sit in your game for some coaching, or look for practice
            partners. We have channels for every race, a looking-for-game channel, a replay
            channel, a FAQ full of resources for new and returning players, and voice channels
            that actually get used.
          </p>
          <p>
            Though we are primarily focused on melee, you are welcome to come and find people for
            your favourite custom game. The Gym also hosts tournaments and runs its own league,
            the{" "}
            <Link href="/gnl/about" className="text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold">
              Gym Newbie League
            </Link>
            .
          </p>
          <p>
            Since the move to Reforged and its limited chat, the Gym has become even more than a
            place to learn Warcraft III: it is where people come to hang out with friends. What
            matters most to us is the atmosphere. We work extremely hard to be a friendly,
            respectful, welcoming community that helps one another become better players.
            Toxicity is not part of the Gym.
          </p>
        </div>

        <section className="mt-14">
          <p className="kicker mb-6">What you will find</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {PILLARS.map(({ Icon, title, body }) => (
              <Surface key={title} className="p-6">
                <span className="skew grid size-11 place-items-center bg-gold/10 text-gold">
                  <Icon size={20} className="[transform:skewX(calc(var(--wg-skew)*-1))]" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold uppercase text-fg">{title}</h3>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </Surface>
            ))}
          </div>
        </section>

        {/* Join */}
        <div className="panel relative mt-14 overflow-hidden border-[#5865F2]/40 p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ backgroundImage: "radial-gradient(28rem 14rem at 100% 120%, rgba(88,101,242,.35), transparent 65%)" }}
          />
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="kicker">Be part of the Gym community</p>
              <h2 className="mt-2 text-[1.15rem] font-bold tracking-[0.05em]">
                Come hang out, practice and get better at the game.
              </h2>
              {community ? (
                <p className="mt-3 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <DiscordIcon size={16} className="text-[#5865F2]" />
                  <span>
                    <strong className="tnum font-bold text-fg">{fmt.format(community.members)}</strong> members
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-2 rounded-full bg-win" />
                    <strong className="tnum font-bold text-fg">{fmt.format(community.online)}</strong> online now
                  </span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={DISCORD_URL} variant="discord" size="lg">
                <DiscordIcon size={20} /> Join the Discord
              </ButtonLink>
              <ButtonLink href="/learn" variant="outline" size="lg">
                Start learning <ArrowRight size={18} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
