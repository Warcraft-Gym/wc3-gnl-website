import Link from "next/link";
import { Code2, Play } from "lucide-react";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_URL, GITHUB_URL, X_URL, YOUTUBE_URL } from "@/lib/links";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "./Wordmark";
import { KeyArt } from "@/components/ui/KeyArt";
import { GNL_NAV } from "./nav-items";

/** lucide dropped brand marks, so X gets a tiny inline glyph. */
function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.5 3h3l-7.2 8.2L21.8 21h-6.4l-4.6-6-5.3 6H2.5l7.7-8.8L2 3h6.5l4.2 5.5L17.5 3Zm-1.1 16.2h1.7L7.3 4.7H5.5l10.9 14.5Z" />
    </svg>
  );
}

const SOCIAL = [
  { href: DISCORD_URL, label: "Discord", Icon: DiscordIcon },
  { href: YOUTUBE_URL, label: "YouTube", Icon: Play },
  { href: X_URL, label: "X (Twitter)", Icon: XIcon },
  { href: GITHUB_URL, label: "GitHub", Icon: Code2 },
];

export function SiteFooter() {
  return (
    <footer className="keyart keyart-dark relative">
      <KeyArt src="/keyart/section-sparks.webp" position="center top" overlay="strong" />
      <div className="rivets relative z-10" aria-hidden />
      <Container className="relative z-10 grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm text-muted">
            Free Warcraft III guides and the Gym Newbie League — a community
            tournament for players who want to improve.
          </p>
          <div className="mt-5 flex gap-2">
            {SOCIAL.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noreferrer"
                className="grid size-9 place-items-center rounded border border-line bg-surface/60 text-muted transition-colors hover:border-gold hover:text-gold"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <nav aria-label="Footer — GNL">
          <p className="kicker mb-4">GNL 18</p>
          <ul className="space-y-2.5 text-sm">
            {GNL_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-muted transition-colors hover:text-gold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer — community">
          <p className="kicker mb-4">Community</p>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/dashboard" className="text-muted hover:text-gold">
                Player Dashboard
              </Link>
            </li>
            <li>
              <Link href="/learn" className="text-muted hover:text-gold">
                Learn
              </Link>
            </li>
            <li>
              <Link href="/blog" className="text-muted hover:text-gold">
                News
              </Link>
            </li>
            <li>
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noreferrer"
                className="text-muted hover:text-gold"
              >
                Discord
              </a>
            </li>
          </ul>
        </nav>
      </Container>

      <Container className="relative z-10 flex flex-col gap-2 border-t border-line/50 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Warcraft 3 Gym. Community project.</p>
        <p>
          Not affiliated with or endorsed by Blizzard Entertainment. Warcraft is a
          trademark of Blizzard Entertainment, Inc.
        </p>
      </Container>
    </footer>
  );
}
