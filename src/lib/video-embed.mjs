/** Turns a video page URL into an embeddable player URL.
 *
 * Shared by the Portable Text renderer (a `youtube` block inside a guide or
 * post body) and by a creep route's own Video field, so a link pasted in
 * either place is understood the same way.
 *
 * YouTube goes through `youtube-nocookie.com`: the visitor gets the player
 * without YouTube setting tracking cookies until they press play, which is
 * the difference between the site embedding a video and the site quietly
 * handing a third party a profile of everyone who read the page.
 *
 * Returns `null` for anything unrecognised. Callers fall back to a plain
 * link — a URL we cannot embed is still worth offering.
 */

/** YouTube ids are exactly 11 characters of `[A-Za-z0-9_-]`. Matching the
 *  length rather than "everything up to the next &" is what keeps
 *  `?v=ID&list=…&t=30` from embedding the playlist parameters too. */
const YOUTUBE = /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{11})/;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/;

export function embedUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const yt = raw.match(YOUTUBE);
  if (yt?.[1]) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = raw.match(VIMEO);
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/** Whether a URL is one this site can embed — used by form validation, so an
 *  author is told at submit time rather than discovering a bare link later. */
export function isEmbeddable(raw) {
  return embedUrl(raw) !== null;
}
