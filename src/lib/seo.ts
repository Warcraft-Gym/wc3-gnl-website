import { DISCORD_URL, GITHUB_URL, X_URL, YOUTUBE_URL } from "./links";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "./site";

/** schema.org helpers shared by the pages. Keep ids stable: they let
 *  crawlers connect the organisation, the site and each page. */

export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/icon.png"),
    description: SITE_DESCRIPTION,
    sameAs: [DISCORD_URL, YOUTUBE_URL, X_URL, GITHUB_URL],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleJsonLd(a: {
  path: string;
  title: string;
  description: string;
  publishedAt: string;
  modifiedAt?: string;
  author?: string;
  image?: string;
  section?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: absoluteUrl(a.path),
    headline: a.title,
    description: a.description,
    datePublished: a.publishedAt,
    dateModified: a.modifiedAt ?? a.publishedAt,
    ...(a.image ? { image: [a.image] } : {}),
    ...(a.section ? { articleSection: a.section } : {}),
    author: a.author ? { "@type": "Person", name: a.author } : { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
    about: { "@type": "VideoGame", name: "Warcraft III: Reforged" },
  };
}

/** A player page is a profile of a person who competes in the league. */
export function profilePageJsonLd(p: {
  path: string;
  name: string;
  description: string;
  team?: string;
  sameAs?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntityOfPage: absoluteUrl(p.path),
    inLanguage: "en",
    mainEntity: {
      "@type": "Person",
      name: p.name,
      description: p.description,
      url: absoluteUrl(p.path),
      ...(p.team ? { memberOf: { "@type": "SportsTeam", name: p.team } } : {}),
      ...(p.sameAs?.length ? { sameAs: p.sameAs } : {}),
    },
    publisher: { "@id": ORG_ID },
  };
}

/** A team page: the roster of one season of the league. */
export function sportsTeamJsonLd(t: {
  path: string;
  name: string;
  description: string;
  logo?: string;
  members: string[];
  coaches?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "@id": absoluteUrl(t.path),
    name: t.name,
    description: t.description,
    url: absoluteUrl(t.path),
    sport: "Esports",
    ...(t.logo ? { logo: t.logo } : {}),
    memberOf: { "@type": "SportsOrganization", name: "Gym Newbie League", url: absoluteUrl("/gnl/about") },
    ...(t.members.length ? { athlete: t.members.map((name) => ({ "@type": "Person", name })) } : {}),
    ...(t.coaches?.length ? { coach: t.coaches.map((name) => ({ "@type": "Person", name })) } : {}),
    publisher: { "@id": ORG_ID },
  };
}

/** A list page: the items in the order the page shows them. */
export function itemListJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

/** A build order (or a creep route) is a HowTo: ordered steps with a
 *  position and text. `name` is computed from `time`/`supply` (a build's
 *  own step markers) unless the caller supplies its own `name` directly
 *  (a creep route has no time dimension — its steps name the camp/action
 *  instead, see `RouteStop`). */
export function howToJsonLd(b: {
  path: string;
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  modifiedAt: string;
  steps: { instruction: string; supply?: number; time?: string; name?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    mainEntityOfPage: absoluteUrl(b.path),
    name: b.title,
    description: b.description,
    datePublished: b.publishedAt,
    dateModified: b.modifiedAt,
    author: { "@type": "Person", name: b.author },
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
    about: { "@type": "VideoGame", name: "Warcraft III: Reforged" },
    step: b.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name:
        s.name ??
        ([s.time, s.supply != null ? `${s.supply} food` : null].filter(Boolean).join(", ") || `Step ${i + 1}`),
      text: s.instruction,
    })),
  };
}
