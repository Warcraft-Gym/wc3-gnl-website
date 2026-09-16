import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { DISCORD_URL, YOUTUBE_URL } from "@/lib/links";

const TILES = [
  {
    art: "/graphics/coaching-replay-2.png",
    title: "Coaching & replay reviews",
    body: "Volunteer coaches from grass league to semi-pro review your replays, answer questions and run practice sessions. Just ask in the Discord.",
    href: DISCORD_URL,
    cta: "Open the Discord",
    external: true,
  },
  {
    art: "/graphics/king-of-the-hill-2.png",
    title: "King of the Hill nights",
    body: "Casual community events where one player holds the hill and everyone lines up to knock them off. Low stakes, high fun, open to all.",
    href: "/blog",
    cta: "See past events",
    external: false,
  },
  {
    art: "/graphics/replay-of-month-2.png",
    title: "Replay of the month",
    body: "The community picks the best game each month — clutch base trades, hero snipes, comebacks — and the coaches break it down.",
    href: "/blog",
    cta: "Watch the picks",
    external: false,
  },
  {
    art: "/graphics/casts-youtube-2.png",
    title: "Casts on YouTube",
    body: "League series and community games cast live by Gym members, with VODs on the channel if you missed the night.",
    href: YOUTUBE_URL,
    cta: "Go to the channel",
    external: true,
  },
];

/** Four panels describing what the community does beyond the guides, each
 *  with its painted emblem. */
export function CommunityTiles() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {TILES.map(({ art, title, body, href, cta, external }) => {
        const inner = (
          <>
            <span className="relative block size-20 shrink-0 transition-transform duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:scale-105">
              <span
                aria-hidden
                className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-40 blur-lg transition-opacity duration-[var(--wg-dur)] group-hover:opacity-90"
              />
              <Image
                src={art}
                alt=""
                fill
                sizes="80px"
                className="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,.8)]"
              />
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
