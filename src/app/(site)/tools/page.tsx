import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, MonitorPlay, LayoutDashboard } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { DASHBOARD_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Tools",
  description: "Apps and utilities from the Warcraft 3 Gym: the build order overlay and the player dashboard.",
};

const TOOLS = [
  {
    href: "/tools/overlay",
    Icon: MonitorPlay,
    title: "Build order overlay",
    badge: "Beta",
    body: "A desktop app that floats a build order over Warcraft III while you play, with a clock and global shortcuts.",
    external: false,
  },
  {
    href: DASHBOARD_URL,
    Icon: LayoutDashboard,
    title: "Player dashboard",
    body: "Availability, scheduling, results and your fantasy team for the Gym Newbie League.",
    external: true,
  },
];

export default function ToolsPage() {
  return (
    <>
      <PageHeader kicker="Warcraft 3 Gym" title="Tools" lead="Apps and utilities built by the Gym for players." />
      <Container className="py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map(({ href, Icon, title, badge, body, external }) => {
            const inner = (
              <>
                <span className="skew grid size-11 place-items-center bg-gold/10 text-gold">
                  <Icon size={20} className="[transform:skewX(calc(var(--wg-skew)*-1))]" />
                </span>
                <h2 className="mt-4 flex items-center gap-2 font-display text-lg font-bold uppercase text-fg">
                  {title}
                  {badge ? (
                    <span className="rounded border border-arcane/50 px-1.5 py-0.5 font-mono text-[0.6rem] tracking-[0.16em] text-arcane">
                      {badge}
                    </span>
                  ) : null}
                </h2>
                <p className="mt-2 text-sm text-muted">{body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-wide text-gold">
                  {external ? "Open" : "Learn more"} {external ? <ExternalLink size={12} /> : <ArrowRight size={12} />}
                </span>
              </>
            );
            const cls = "panel group block p-6 transition-colors hover:border-gold/50";
            return external ? (
              <a key={href} href={href} target="_blank" rel="noreferrer" className={cls}>
                {inner}
              </a>
            ) : (
              <Link key={href} href={href} className={cls}>
                {inner}
              </Link>
            );
          })}
        </div>
      </Container>
    </>
  );
}
