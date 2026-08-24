import Link from "next/link";
import { Code2, Tv, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "./Wordmark";
import { GNL_NAV } from "./nav-items";

const SOCIAL = [
  { href: "https://github.com/Warcraft-Gym", label: "GitHub", Icon: Code2 },
  { href: "https://discord.gg/7HUyQAKQ8p", label: "Discord", Icon: MessageCircle },
  { href: "https://twitch.tv", label: "Twitch", Icon: Tv },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-[var(--wg-space-section)] border-t border-line/70 bg-bg-deep/60">
      <div className="rule-gold" aria-hidden />
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm text-muted">
            A community-driven competitive Warcraft III league. Built by players,
            for players.
          </p>
          <div className="mt-5 flex gap-2">
            {SOCIAL.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noreferrer"
                className="grid size-9 place-items-center border border-line text-muted transition-colors hover:border-gold hover:text-gold"
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
                  className="uppercase tracking-wide text-muted transition-colors hover:text-gold"
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
              <Link href="/dashboard" className="uppercase tracking-wide text-muted hover:text-gold">
                Player Dashboard
              </Link>
            </li>
            <li>
              <Link href="/learn" className="uppercase tracking-wide text-muted hover:text-gold">
                Learn
              </Link>
            </li>
            <li>
              <Link href="/blog" className="uppercase tracking-wide text-muted hover:text-gold">
                News
              </Link>
            </li>
            <li>
              <a
                href="https://discord.gg/7HUyQAKQ8p"
                target="_blank"
                rel="noreferrer"
                className="uppercase tracking-wide text-muted hover:text-gold"
              >
                Discord
              </a>
            </li>
          </ul>
        </nav>
      </Container>

      <Container className="flex flex-col gap-2 border-t border-line/50 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Warcraft 3 Gym. Community project.</p>
        <p>
          Not affiliated with or endorsed by Blizzard Entertainment. Warcraft is a
          trademark of Blizzard Entertainment, Inc.
        </p>
      </Container>
    </footer>
  );
}
