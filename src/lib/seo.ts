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

/** A build order is a HowTo: ordered steps with a position and text. */
export function howToJsonLd(b: {
  path: string;
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  modifiedAt: string;
  steps: { instruction: string; supply?: number; time?: string }[];
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
      name: [s.time, s.supply != null ? `${s.supply} food` : null].filter(Boolean).join(", ") || `Step ${i + 1}`,
      text: s.instruction,
    })),
  };
}
