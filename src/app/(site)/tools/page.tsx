import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { GYM_TOOLS, type Tool } from "@/lib/tools";
import { getCommunityToolGroups, type CommunityTool } from "@/lib/tools-data";
import { urlFor } from "@/sanity/image";
import type { LucideIcon } from "lucide-react";
import { Wrench } from "lucide-react";
import { OVERLAY_BETA_LIVE } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Community-made Warcraft III tools: the W3Champions ladder, replay parsers, build order overlays, streaming tools, creep route and hotkey trainers.",
  alternates: { canonical: "/tools" },
};

type CardProps = {
  href: string;
  title: string;
  body: string;
  by?: string;
  badge?: string;
  imageSrc: string;
  Icon: LucideIcon;
};

function fromGymTool(t: Tool): CardProps {
  return { href: t.href, title: t.title, body: t.body, by: t.by, badge: t.badge, imageSrc: t.image, Icon: t.Icon };
}

function fromCommunityTool(t: CommunityTool): CardProps {
  const imageSrc = t.image
    ? urlFor(t.image as Parameters<typeof urlFor>[0]).width(800).height(450).fit("crop").auto("format").url()
    : (t.imagePath ?? "/tools/overlay.webp");
  return { href: t.url, title: t.title, body: t.body, by: t.by, badge: t.badge, imageSrc, Icon: Wrench };
}

/** `wide`: the one card of a group runs image beside text across the row,
 *  so a group of one does not leave two thirds of the grid empty. */
function ToolCard({ tool, wide = false }: { tool: CardProps; wide?: boolean }) {
  const { href, Icon, title, body, by, badge, imageSrc } = tool;
  const external = href.startsWith("http");
  const host = external ? new URL(href).hostname.replace(/^www\./, "") : null;
  const inner = (
    <>
      <span
        className={cn(
          "relative -mx-6 -mt-6 mb-5 block aspect-video overflow-hidden rounded-t border-b border-line/70 bg-bg-deep",
          wide && "sm:-my-6 sm:mb-0 sm:mr-0 sm:aspect-auto sm:min-h-64 sm:rounded-l sm:rounded-tr-none sm:border-b-0 sm:border-r",
        )}
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-top transition-transform duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
        />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(0,0,0,.55))]" />
      </span>
      <div className={cn("flex flex-1 flex-col", wide && "sm:justify-center")}>
      <div className="flex items-start justify-between gap-3">
        <span className="skew grid size-11 place-items-center bg-gold/10 text-gold">
          <Icon size={22} className="[transform:skewX(calc(var(--wg-skew)*-1))]" />
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
            {host} <ExternalLink size={14} />
          </>
        ) : (
          <>
            Learn more <ArrowRight size={14} />
          </>
        )}
      </span>
      </div>
    </>
  );
  const cls = cn(
    "panel group flex h-full flex-col overflow-hidden p-6 transition-colors hover:border-gold/50",
    wide && "sm:grid sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-8",
  );
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

export default async function ToolsPage() {
  const groups = await getCommunityToolGroups();
  return (
    <>
      <PageHeader
        kicker="Warcraft 3 Gym"
        title="Tools"
        lead={
          OVERLAY_BETA_LIVE
            ? "Apps from the Gym, and the community-made tools we point players to every day."
            : "Community-made tools we point players to every day. Made by other people in the scene, and not run by the Gym."
        }
      />
      <Container className="py-10">
        {OVERLAY_BETA_LIVE ? (
          <section className="mb-14">
            <p className="kicker mb-5">From the Gym</p>
            <div className={cn("grid gap-4", GYM_TOOLS.length > 1 && "sm:grid-cols-2 lg:grid-cols-3")}>
              {GYM_TOOLS.map((t) => (
                <ToolCard key={t.href} tool={fromGymTool(t)} wide={GYM_TOOLS.length === 1} />
              ))}
            </div>
          </section>
        ) : null}

        {groups.map((group, i) => (
          <section key={group.title} className={i === 0 ? "" : "mt-14"}>
            <div className="mb-5">
              <p className="kicker">{group.title}</p>
              {group.blurb ? <p className="mt-2 max-w-2xl text-sm text-muted">{group.blurb}</p> : null}
            </div>
            <div className={cn("grid gap-4", group.tools.length > 1 && "sm:grid-cols-2 lg:grid-cols-3")}>
              {group.tools.map((t) => (
                <ToolCard key={t.id} tool={fromCommunityTool(t)} wide={group.tools.length === 1} />
              ))}
            </div>
          </section>
        ))}
      </Container>
    </>
  );
}
