import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { COMMUNITY_TOOLS, GYM_TOOLS, type Tool } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Apps and utilities for Warcraft III players: the Gym's build order overlay and player dashboard, plus the community's ladder, creep, hotkey and replay tools.",
};

function ToolCard({ tool }: { tool: Tool }) {
  const { href, Icon, title, body, by, badge, image } = tool;
  const external = href.startsWith("http");
  const host = external ? new URL(href).hostname.replace(/^www\./, "") : null;
  const inner = (
    <>
      <span className="relative -mx-6 -mt-6 mb-5 block aspect-video overflow-hidden rounded-t border-b border-line/70 bg-bg-deep">
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-top transition-transform duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
        />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(0,0,0,.55))]" />
      </span>
      <div className="flex items-start justify-between gap-3">
        <span className="skew grid size-11 place-items-center bg-gold/10 text-gold">
          <Icon size={20} className="[transform:skewX(calc(var(--wg-skew)*-1))]" />
        </span>
        {by ? <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">by {by}</span> : null}
      </div>
      <h2 className="mt-4 flex flex-wrap items-center gap-2 font-display text-lg font-bold uppercase text-fg">
        {title}
        {badge ? (
          <span className="rounded border border-arcane/50 px-1.5 py-0.5 font-mono text-[0.6rem] tracking-[0.16em] text-arcane">
            {badge}
          </span>
        ) : null}
      </h2>
      <p className="mt-2 flex-1 text-sm text-muted">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-wide text-gold">
        {external ? (
          <>
            {host} <ExternalLink size={12} />
          </>
        ) : (
          <>
            Learn more <ArrowRight size={12} />
          </>
        )}
      </span>
    </>
  );
  const cls = "panel group flex h-full flex-col overflow-hidden p-6 transition-colors hover:border-gold/50";
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

export default function ToolsPage() {
  return (
    <>
      <PageHeader
        kicker="Warcraft 3 Gym"
        title="Tools"
        lead="Apps from the Gym, and the community tools we point players to every day."
      />
      <Container className="py-10">
        <section>
          <p className="kicker mb-5">From the Gym</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {GYM_TOOLS.map((t) => (
              <ToolCard key={t.href} tool={t} />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-5">
            <p className="kicker">From the community</p>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Made by other people in the scene. We use them, we recommend them, and none of them are run by the Gym.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMMUNITY_TOOLS.map((t) => (
              <ToolCard key={t.href} tool={t} />
            ))}
          </div>
        </section>
      </Container>
    </>
  );
}
