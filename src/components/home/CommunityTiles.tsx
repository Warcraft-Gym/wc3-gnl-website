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
    <ul className="grid content-start gap-x-4 gap-y-12 pt-9 sm:grid-cols-2 lg:self-center">
      {TILES.map(({ art, title, body, href, cta, external }) => {
        const inner = (
          <>
            {/* Emblem sits over the top-left edge, outside the panel */}
            <span className="pointer-events-none absolute -top-9 left-4 block size-[5.5rem] transition-transform duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:-translate-y-1">
              <span
                aria-hidden
                className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-40 blur-lg transition-opacity duration-[var(--wg-dur)] group-hover:opacity-90"
              />
              <Image
                src={art}
                alt=""
                fill
                sizes="88px"
                className="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,.85)]"
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
        const cls = "panel group relative flex h-full items-start gap-4 px-5 pb-5 pt-14 transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50";
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
