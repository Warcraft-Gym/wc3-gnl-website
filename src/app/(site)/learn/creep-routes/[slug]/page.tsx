import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, PencilLine } from "lucide-react";
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
import { routeEditHref } from "@/lib/creep-routes/edit-link.mjs";
import { GameIcon } from "@/components/builds/GameIcon";
import { VideoEmbed } from "@/components/ui/VideoEmbed";
import { isEmbeddable } from "@/lib/video-embed.mjs";
import { getGameIcon } from "@/lib/builds/icons";
import { CREEP_ROUTES_LIVE } from "@/lib/flags";
import { getCreepRouteBySlug, getCreepRoutes, getSupersedingRouteSlug } from "@/lib/creep-routes/routes";
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
  if (!route) {
    // An archived route whose author submitted a replacement: send readers
    // to the current version rather than 404ing a link that is already out
    // in Discord.
    const successor = await getSupersedingRouteSlug(slug);
    if (successor) redirect(`/learn/creep-routes/${successor}`);
    notFound();
  }

  const map = await getCreepMapBySlug(route.map.slug);
  if (!map) notFound();

  // Built server-side so the link is in the HTML: no hydration wait, and it
  // still works with JavaScript disabled up to the point the form needs it.
  const editHref = routeEditHref(route);
  // `undefined` for a route with no hero, or an icon key the manifest does
  // not know — render nothing rather than an empty chip.
  const heroIcon = getGameIcon(route.hero);

  // Until this page had a Video field, an author with a VOD had one place to
  // put it: Source. Every route on the site that has a source link has a
  // YouTube link there. So a source we *can* embed is treated as the video
  // when no explicit one is set — the existing routes gain a player without
  // anyone rewriting their submissions, and the Source button still points
  // at the same URL for anyone who wants the original page.
  const videoUrl = route.videoUrl ?? (isEmbeddable(route.sourceUrl) ? route.sourceUrl : undefined);

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
            {/* The hero the route is built around. Collected at submission
                and carried by every projection, but until now never shown —
                which made it look like the field did nothing. Named as well
                as drawn: the portrait alone is only legible to someone who
                already knows the icon. */}
            {heroIcon ? (
              <span className="flex items-center gap-2" title={`Hero: ${heroIcon.title}`}>
                <GameIcon iconKey={route.hero} size={22} className="rounded ring-1 ring-gold/30" />
                <span className="text-xs text-muted">{heroIcon.title}</span>
              </span>
            ) : null}
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
          </p>

          {/* Actions, not metadata. Both of these were 11px links inside the
              faint byline, where they read as small print rather than
              something you can click — and a 11px target is below the size
              anyone should have to hit on a phone. They are the only two
              things a reader can *do* on this page, so they get the site's
              button treatment and a row of their own.

              "Suggest an update": no accounts, so an author cannot edit in
              place. This opens the submit form prefilled with this route and
              already naming it as the one being replaced, so editing is a
              review of a diff rather than retyping. Anyone may suggest one;
              a coach decides. */}
          {route.sourceUrl || editHref ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {editHref ? (
                <ButtonLink href={editHref} variant="outline" size="sm" className="max-sm:w-auto">
                  <PencilLine size={14} aria-hidden /> Suggest an update
                </ButtonLink>
              ) : null}
              {route.sourceUrl ? (
                <ButtonLink
                  href={route.sourceUrl}
                  variant="ghost"
                  size="sm"
                  className="max-sm:w-auto"
                  target="_blank"
                  rel="noreferrer"
                >
                  Source <ExternalLink size={14} aria-hidden />
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
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

      {/* The route played out. Its own band above the notes, and absent
          entirely when there is no video — same rule as the description
          block below, so nothing leaves a blank gap. */}
      {videoUrl ? (
        <Container className="max-w-3xl pb-4">
          <h2 className="mb-3 text-[1.05rem] font-bold tracking-[0.06em]">Watch the route</h2>
          <VideoEmbed url={videoUrl} title={`${route.title} — video`} />
        </Container>
      ) : null}

      {/* "About this route" spans the full width, a sibling band of
          Companion build and "More creep routes" below rather than a narrow
          column with an empty half beside it (it kept the two-column grid
          after F009-followup-5 moved Companion build and the Discord panel
          out of it, leaving a spacer that did nothing). No empty-state
          placeholder
          (F009-followup-4): the block, heading included, is absent when
          the route has no description — and so is this wrapping band, so
          an empty description never leaves a blank gap above Companion
          build. */}
      {route.description && route.description.length ? (
        <Container className="pb-16">
          <section className="min-w-0">
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
          </section>
        </Container>
      ) : null}

      {/* Companion build: full-width sibling band of "More creep routes"
          below (F009-followup-5, user request: "make the Companion build
          spread the full width as the More creep routes section") — same
          `Container`, same `<h2>` heading treatment, same
          `<ul className="grid gap-3">` list wrapper, so the two read as
          one family instead of one being a narrow card. The `BuildRow`
          this renders is the same one `/learn/builds` renders
          (F009-followup-4 item 2, user request), mirroring the inverse
          "Creep routes for this build" section on `/learn/builds/[slug]`
          which reuses `RouteRow`. Absent entirely when the route has no
          build link, or when the linked build didn't resolve. */}
      {companionBuild ? (
        <Container className="pb-16">
          <h2 className="mb-4 text-[1.05rem] font-bold tracking-[0.06em]">Companion build</h2>
          <ul className="grid gap-3">
            <BuildRow build={companionBuild} />
          </ul>
        </Container>
      ) : null}

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

      {/* Discord panel: now last (F009-followup-5's ordering rule —
          description → Companion build → More creep routes → Discord),
          its own full-width `Container` so it stays a sibling band, but
          the card itself keeps its original `max-w-2xl` width and
          left-aligned position rather than stretching edge to edge — it
          is a card, not a list section with a heading like the two above. */}
      <Container className="pb-16">
        <div className="panel flex max-w-2xl flex-col items-start gap-4 border-[#5865F2]/40 p-5">
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
      </Container>
    </article>
  );
}
