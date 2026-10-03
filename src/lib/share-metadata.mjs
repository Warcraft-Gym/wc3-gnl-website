/**
 * Per-page metadata that link previews read correctly.
 *
 * Next merges `openGraph` and `twitter` per top-level key: a page that sets
 * only `title` and `description` keeps the root layout's whole `openGraph`
 * object, so Facebook, LinkedIn and WhatsApp got the home page's og:title and
 * an og:url of the site root (which they treat as canonical, and show the
 * home page card). And a page that does declare `openGraph` replaces the
 * object outright, losing the site defaults and the inherited share image.
 *
 * `pageMetadata` builds the full objects every time, so each page states its
 * own title, description and url without dropping the defaults.
 *
 * Images: a route with its own `opengraph-image` file passes `ownCard: true`
 * and the `images` key is left out entirely; Next fills og:image from the file
 * only when the page's openGraph has no `images` property at all. Every other
 * route gets the explicit images it passes, or the site card. `twitter.images`
 * is never set: Next copies og:image into twitter:image when it is absent, so
 * X shows the same card as everyone else.
 */
import { SITE_NAME, TWITTER_HANDLE } from "./site-identity.mjs";

export { SITE_NAME, TWITTER_HANDLE };

/** The root `src/app/opengraph-image.jpg`, served at this path. */
export const DEFAULT_SHARE_IMAGE = Object.freeze({ url: "/opengraph-image.jpg", width: 1200, height: 630 });

export const OPEN_GRAPH_DEFAULTS = Object.freeze({ type: "website", siteName: SITE_NAME, locale: "en_US" });
export const TWITTER_DEFAULTS = Object.freeze({ card: "summary_large_image", site: TWITTER_HANDLE });

/**
 * The preview title: the same string as the document `<title>`, which the
 * root layout's `title.template` builds as `%s · Warcraft 3 Gym`. Templates do
 * not apply to openGraph or twitter titles, so it is spelled out here.
 * @param {string} title
 */
export function shareTitle(title) {
  return `${title} · ${SITE_NAME}`;
}

/**
 * @typedef {NonNullable<import("next").Metadata["openGraph"]>} OpenGraph
 * @typedef {{ url: string; width?: number; height?: number; alt?: string }} ShareImage
 * @typedef {{ publishedTime?: string; modifiedTime?: string; authors?: string[]; section?: string }} ArticleFields
 * @typedef {Omit<import("next").Metadata, "title" | "description" | "alternates" | "openGraph" | "twitter"> & {
 *   title: string;
 *   description?: string;
 *   path: string;
 *   shareDescription?: string;
 *   ownCard?: boolean;
 *   images?: ShareImage[];
 *   article?: ArticleFields;
 * }} PageMetadataInput
 */

/**
 * @param {PageMetadataInput} input
 *   `title`: the page title, before the layout template.
 *   `path`: the canonical path, also used as og:url.
 *   `shareDescription`: a shorter preview text, when the meta description is long.
 *   `ownCard`: the route has its own `opengraph-image` file.
 *   `images`: explicit share images, for a route without its own card.
 *   `article`: switches og:type to article and carries its fields.
 *   Anything else (`robots`, ...) is passed through.
 * @returns {import("next").Metadata}
 */
export function pageMetadata({ title, description, path, shareDescription, ownCard = false, images, article, ...rest }) {
  if (typeof title !== "string" || !title.trim()) throw new Error("pageMetadata: title is required");
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`pageMetadata: path must be a site-relative path starting with "/", got ${JSON.stringify(path)}`);
  }
  if (ownCard && images?.length) {
    throw new Error("pageMetadata: pass ownCard or images, not both; explicit images would hide the route's opengraph-image");
  }

  const previewTitle = shareTitle(title);
  const previewDescription = shareDescription ?? description;
  const shareImages = images?.length ? images.map((image) => ({ ...image })) : [{ ...DEFAULT_SHARE_IMAGE }];

  return {
    ...rest,
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
      ...(article ? { ...article, type: "article" } : {}),
      title: previewTitle,
      description: previewDescription,
      url: path,
      ...(ownCard ? {} : { images: shareImages }),
    },
    twitter: { ...TWITTER_DEFAULTS, title: previewTitle, description: previewDescription },
  };
}
