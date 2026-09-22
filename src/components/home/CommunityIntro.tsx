import { ButtonLink } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_URL } from "@/lib/links";
import type { DiscordCommunity } from "@/lib/discord";

const STEPS = [
  {
    title: "Join the Discord",
    body: "One click, free, no application. Introduce yourself. Everyone remembers being new.",
  },
  {
    title: "Find your people",
    body: "Race channels, practice partners at your level, and coaches who answer questions in the open.",
  },
  {
    title: "Show up for the fun",
    body: "Coaching sessions, King of the Hill nights, replay of the month, casts, and the GNL when a season opens.",
  },
];

const fmt = new Intl.NumberFormat("en-US");

/** Left column of the community section: the invitation, live numbers from
 *  Discord, the three steps to get involved, and the button. */
export function CommunityIntro({ community }: { community: DiscordCommunity | null }) {
  return (
    <div>
      <p className="kicker">The Gym Discord</p>
      <h2 className="mt-3 text-[length:var(--wg-text-display)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
        Join the community
      </h2>
      <p className="balance mt-5 max-w-md text-lg text-muted">
        Nobody gets good at Warcraft III alone. The Gym is a community of
        players who help each other improve and have fun doing it, coaching,
        replay reviews, casual nights and casts, all run by volunteers. New
        players are welcomed, not judged.
      </p>

      {community ? (
        <p className="mt-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-line bg-surface/60 px-3 py-2 text-sm text-muted">
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

      <ol className="mt-7 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="btn-gold grid size-8 shrink-0 place-items-center rounded font-display text-sm font-bold">
              {i + 1}
            </span>
            <span>
              <span className="block font-display text-[0.85rem] font-bold uppercase tracking-[0.08em] text-fg">
                {s.title}
              </span>
              <span className="mt-1 block text-sm text-muted">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <ButtonLink href={DISCORD_URL} variant="discord" size="lg">
          <DiscordIcon size={20} /> Join the Discord
        </ButtonLink>
      </div>
    </div>
  );
}
