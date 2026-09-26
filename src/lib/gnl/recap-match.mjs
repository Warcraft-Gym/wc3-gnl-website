/** Finds the blog post announcing a season's winner.
 *
 * The announcements are written by hand over five years and the wording
 * drifts — "CRIT HAPPENS WINS GNL S18!", "GNL BEARS WIN GNL S15!",
 * "Giggling Goblins got the Last Laugh.  GG wins GNL S14!" — so matching is
 * on the season number plus a win word, not on a title format.
 *
 * Two kinds of post must NOT match, and both exist:
 *   "Signups are open for GNL Season 15!"  — same season, not a result
 *   "GNL Fantasy League S10 Recap"         — a different competition
 * Hence `GNL S<n>` as one token: "GNL Season 15" has a letter after the S,
 * and "League S10" has the wrong word before it.
 */

const SEASON = /\bGNL\s*S(\d{1,3})\b/i;
const WIN = /\bwins?\b/i;

/** The season number a post announces a winner for, or null. */
export function recapSeason(title) {
  if (typeof title !== "string") return null;
  if (!WIN.test(title)) return null;
  const m = title.match(SEASON);
  return m ? Number(m[1]) : null;
}

/** `{ [seasonNumber]: post }` for the posts that announce a winner. If a
 *  season somehow has two, the later one wins. */
export function indexRecaps(posts) {
  const bySeason = {};
  for (const post of Array.isArray(posts) ? posts : []) {
    const n = recapSeason(post?.title);
    if (n === null) continue;
    const prev = bySeason[n];
    if (!prev || String(post.publishedAt ?? "") > String(prev.publishedAt ?? "")) bySeason[n] = post;
  }
  return bySeason;
}
