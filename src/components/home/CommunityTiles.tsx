import Link from "next/link";
import { ArrowUpRight, Crown, Play, Video } from "lucide-react";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_URL, YOUTUBE_URL } from "@/lib/links";

const TILES = [
  {
    Icon: DiscordIcon,
    title: "Coaching & replay reviews",
    body: "Volunteer coaches from grass league to semi-pro review your replays, answer questions and run practice sessions. Just ask in the Discord.",
    href: DISCORD_URL,
    cta: "Open the Discord",
    external: true,
  },
  {
    Icon: Crown,
    title: "King of the Hill nights",
    body: "Casual community events where one player holds the hill and everyone lines up to knock them off. Low stakes, high fun, open to all.",
    href: "/blog",
    cta: "See past events",
    external: false,
  },
  {
    Icon: Video,
    title: "Replay of the month",
    body: "The community picks the best game each month — clutch base trades, hero snipes, comebacks — and the coaches break it down.",
    href: "/blog",
    cta: "Watch the picks",
    external: false,
  },
  {
    Icon: Play,
    title: "Casts on YouTube",
    body: "League series and community games cast live by Gym members, with VODs on the channel if you missed the night.",
    href: YOUTUBE_URL,
    cta: "Go to the channel",
    external: true,
  },
];

/** Four panels describing what the community does beyond the guides. */
export function CommunityTiles() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {TILES.map(({ Icon, title, body, href, cta, external }) => {
        const inner = (
          <>
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-gold/30 bg-surface-2 text-gold">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <h3 className="text-[1rem] font-bold tracking-[0.06em] text-fg transition-colors group-hover:text-gold">
                  {title}
                </h3>
                <ArrowUpRight size={18} className="shrink-0 text-faint transition-colors group-hover:text-gold" />
              </span>
              <p className="mt-2 text-sm text-muted">{body}</p>
              <span className="kicker mt-4 text-[0.62rem]">{cta}</span>
            </span>
          </>
        );
        const cls = "panel group flex h-full items-start gap-4 p-5 transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50";
        return (
          <li key={title}>
            {external ? (
              <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
            ) : (
              <Link href={href} className={cls}>{inner}</Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
