import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { KeyArt } from "@/components/ui/KeyArt";
import { ButtonLink } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_BUILDS_CHANNEL_URL } from "@/lib/links";
import { PortableBody } from "@/components/sanity/PortableBody";
import { CreepMapPlayground } from "./CreepMapPlayground";
import { Matchup, TagChip } from "@/components/builds/BuildBadges";
import { BuildRow } from "@/components/builds/BuildRow";
import { LevelBadge } from "@/components/creep-routes/RouteBadges";
import { RouteBackLink } from "@/components/creep-routes/RouteBackLink";
import { CREEP_ROUTES_LIVE } from "@/lib/flags";
import { getCreepRouteBySlug, getCreepRoutes } from "@/lib/creep-routes/routes";
import { getCreepMapBySlug } from "@/lib/creep-routes/maps";
import { campLabel } from "@/lib/creep-routes/camp-label.mjs";
import { BUILD_RACES } from "@/lib/builds/types";
import { getBuildBySlug } from "@/lib/builds/builds";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, howToJsonLd } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  if (!CREEP_ROUTES_LIVE) return [];
  const routes = await getCreepRoutes();
  return routes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const route = CREEP_ROUTES_LIVE ? await getCreepRouteBySlug(slug) : undefined;
  if (!route) return { title: "Creep route not found" };
  const race = BUILD_RACES.find((r) => r.id === route.race)?.label;
  const title = `${route.title}: ${race} creep route on ${route.map.name}`;
  return {
    title,
    description: route.summary,
    alternates: { canonical: `/learn/creep-routes/${route.slug}` },
    openGraph: {
      title,
      description: route.summary,
      type: "article",
      url: `/learn/creep-routes/${route.slug}`,
      publishedTime: route.publishedAt,
      modifiedTime: route.updatedAt,
      authors: [route.author],
      images: [{ url: `/factions/headers/${route.race}.webp`, width: 1600, height: 700 }],
    },
    twitter: { card: "summary_large_image", title, description: route.summary },
  };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

function isPortableText(v: unknown[]): v is Record<string, unknown>[] {
  return typeof v[0] === "object";
}

export default async function CreepRoutePage({ params }: Params) {
  if (!CREEP_ROUTES_LIVE) notFound();
  const { slug } = await params;
  const route = await getCreepRouteBySlug(slug);
  if (!route) notFound();

  const map = await getCreepMapBySlug(route.map.slug);
  if (!map) notFound();

  const allRoutes = await getCreepRoutes();
  const related = allRoutes
    .filter((r) => r.slug !== route.slug && (r.map.slug === route.map.slug || r.race === route.race))
    .slice(0, 3);

  const mapVersionMismatch =
    route.mapVersion && map.mapVersion && route.mapVersion !== map.mapVersion;

  // Companion build: the route only stores { slug, title } — the row
  // component (`BuildRow`, the same one `/learn/builds` renders, F009-
  // followup-4 item 2) needs a full `BuildOrder`, so fetch it here. A
  // deleted/unpublished build resolves to `undefined`; render nothing for
  // it rather than falling back to a bare link, same rule as every other
  // optional block on this page.
  const companionBuild = route.build ? await getBuildBySlug(route.build.slug) : undefined;
  if (route.build && !companionBuild && process.env.NODE_ENV !== "production") {
    console.warn(
      `[creep-routes] companion build "${route.build.slug}" referenced by route "${route.slug}" did not resolve (deleted or unpublished) — hiding the Companion build block.`,
    );
  }

  const howToSteps = route.stops.map((s) => {
    const camp = s.campId ? map.camps.find((c) => c.id === s.campId) : undefined;
    const name = camp ? campLabel(camp) : (s.action ?? "Base action");
    return {
      name,
      instruction: s.note ?? (camp ? `Clear ${name}` : (s.action ?? "Base action")),
    };
  });

  return (
    <article>
      <JsonLd
        data={howToJsonLd({
          path: `/learn/creep-routes/${route.slug}`,
          title: route.title,
          description: route.summary,
          author: route.author,
          publishedAt: route.publishedAt,
          modifiedAt: route.updatedAt,
          steps: howToSteps,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Learn", path: "/learn" },
          { name: "Creep routes", path: "/learn/creep-routes" },
          { name: route.title, path: `/learn/creep-routes/${route.slug}` },
        ])}
      />
      <div className="keyart -mt-[var(--wg-chrome-h,var(--wg-header-h))]">
        <KeyArt src={`/factions/headers/${route.race}.webp`} position="center 30%" overlay="soft" priority />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(0,0,0,.8)_0%,rgba(0,0,0,.55)_45%,rgba(0,0,0,.15)_100%)]"
        />
        <Container className="relative z-10 pb-12 pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+2.5rem)] sm:pb-16 sm:pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+3.5rem)]">
          <RouteBackLink />
          {/* The map is the primary fact on this page, ranked above the race
              (F009-followup-3, user request: "the map icons are more
              important than the race for creep routes") — a full block
              above the matchup line, not a kicker sharing its rank. 96px,
              the display font at ~1.6rem, a dark square behind
              `object-contain` so a letterboxed minimap shows in full
              (item 6). Carries "map v2.0" and the mapVersion-mismatch
              warning, both still muted, secondary text under the name.
              Stacks (thumbnail above name) below `sm` so the block never
              gets cramped on a narrow screen. */}
          <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Image
              src={map.minimapUrl}
              alt=""
              width={96}
              height={96}
              className="size-24 shrink-0 rounded bg-black/40 object-contain ring-1 ring-gold/40"
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[1.6rem] font-bold uppercase tracking-[0.04em] text-fg [text-shadow:0_2px_16px_rgba(0,0,0,.8)]">
                {route.map.name}
              </span>
              {map.mapVersion ? <span className="text-xs text-faint">map v{map.mapVersion}</span> : null}
              {mapVersionMismatch ? (
                <span className="rounded border border-gold/40 bg-gold/5 px-1.5 py-0.5 text-xs text-gold">
                  Written for v{route.mapVersion}; the catalogue is v{map.mapVersion}
                </span>
              ) : null}
            </div>
          </div>
          {/* The race/vs matchup line, now secondary — below the map block
              (F009-followup-3; it used to lead the header). */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Matchup race={route.race} vsRaces={route.vsRaces} size={22} />
            <LevelBadge level={route.level} />
            {route.patch ? (
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">Patch {route.patch}</span>
            ) : null}
          </div>
          <h1 className="mt-3 max-w-3xl text-[length:var(--wg-text-display)] [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
            {route.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted [text-shadow:0_1px_12px_rgba(0,0,0,.8)]">{route.summary}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
            <span>
              By <span className="text-muted">{route.author}</span>
              {route.authorDiscord ? <span className="text-faint"> ({route.authorDiscord})</span> : null}
            </span>
            {route.maintainer && route.maintainer !== route.author ? (
              <span>· Maintained by <span className="text-muted">{route.maintainer}</span></span>
            ) : null}
            <span>· Updated {formatDate(route.updatedAt)}</span>
            {route.sourceUrl ? (
              <a
                href={route.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-gold hover:underline"
              >
                Source <ExternalLink size={11} />
              </a>
            ) : null}
          </p>
          {route.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {route.tags.map((t) => (
                <TagChip key={t}>{t}</TagChip>
              ))}
            </div>
          ) : null}
        </Container>
        <div className="rivets relative z-10" aria-hidden />
      </div>

      {/* Map + step table dominate: map left, table right sticky at lg,
          stacked below — the client island owns the shared active-stop
          state so hovering/playing the table lights the same marker on
          the map. */}
      <Container className="py-10">
        <CreepMapPlayground map={map} route={route} />
      </Container>

      <Container className="grid gap-10 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
        <section className="min-w-0 max-w-2xl">
          {/* No empty-state placeholder here (F009-followup-4): the whole
              block, heading included, is absent when the route has no
              description — "No notes yet." read as noise on a published
              page that simply has nothing more to say. */}
          {route.description && route.description.length ? (
            <>
              <h2 className="mb-4 text-[1.05rem] font-bold tracking-[0.06em]">About this route</h2>
              {isPortableText(route.description) ? (
                <div className="prose-invert max-w-none">
                  <PortableBody value={route.description} />
                </div>
              ) : (
                <div className="space-y-4 text-[1.02rem] leading-7 text-muted">
                  {(route.description as string[]).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {/* Companion build: the same `BuildRow` `/learn/builds` renders
              (F009-followup-4 item 2, user request), mirroring the inverse
              "Creep routes for this build" section on `/learn/builds/[slug]`
              which reuses `RouteRow`. Absent entirely when the route has no
              build link, or when the linked build didn't resolve. */}
          {companionBuild ? (
            <div className={route.description && route.description.length ? "mt-8" : ""}>
              <h2 className="mb-4 text-[1.05rem] font-bold tracking-[0.06em]">Companion build</h2>
              <ul className="grid gap-3">
                <BuildRow build={companionBuild} />
              </ul>
            </div>
          ) : null}

          <div className="panel mt-5 flex flex-col items-start gap-4 border-[#5865F2]/40 p-5">
            <div>
              <p className="whitespace-nowrap font-display text-[0.85rem] font-bold uppercase tracking-[0.08em] text-fg">
                Questions about this route?
              </p>
              <p className="mt-1 text-sm text-muted">
                Drop it in the build orders channel on the Gym Discord and a coach, or the author, will answer.
              </p>
            </div>
            <ButtonLink href={DISCORD_BUILDS_CHANNEL_URL} variant="discord" size="sm" target="_blank" rel="noreferrer">
              <DiscordIcon size={15} /> Discuss on Discord
            </ButtonLink>
          </div>
        </section>
        <div className="hidden lg:block" aria-hidden />
      </Container>

      {related.length ? (
        <Container className="pb-16">
          <h2 className="mb-4 text-[1.05rem] font-bold tracking-[0.06em]">More creep routes</h2>
          <ul className="grid gap-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/learn/creep-routes/${r.slug}`}
                  className="panel group flex items-center justify-between gap-4 px-5 py-3 transition-[border-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-fg group-hover:text-gold">{r.title}</span>
                    <span className="block truncate text-sm text-muted">{r.map.name}</span>
                  </span>
                  <LevelBadge level={r.level} />
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}
    </article>
  );
}
