/** Turns author-written prose into a meta description.
 *
 * Summaries come from the CMS, where people type what reads well on the page:
 * line breaks, arrows, double spaces. One creep route's summary reaches the
 * <meta> tag as
 *
 *     You start with lightning shield creep \r\n-> go into rogue camp for…
 *
 * carriage returns and all. Search engines collapse that anyway, but they also
 * truncate around 155-160 characters, and a description cut mid-word reads as
 * neglect. This collapses the whitespace and cuts at a word boundary.
 */

/** Google renders roughly 155-160 characters on desktop. */
export const MAX_DESCRIPTION = 160;

export function metaDescription(text, max = MAX_DESCRIPTION) {
  if (typeof text !== "string") return undefined;
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return undefined;
  if (flat.length <= max) return flat;

  // Cut at the last space before the limit, leaving room for the ellipsis, so
  // the description never ends mid-word.
  const clipped = flat.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const body = (lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s,;:.!?-]+$/, "");
  return `${body}…`;
}
