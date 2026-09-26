/** Builds the "Suggest an update" link for a published build order.
 *
 * Mirror of `src/lib/creep-routes/edit-link.mjs`; see that file and
 * `docs/creep-routes.md`, "Editing a submitted route", for why updating
 * means resubmitting rather than editing in place.
 */
import { EXCHANGE_FORMAT_SINGLE, IMPORT_HASH_KEY, encodeForHash } from "./exchange-codec.mjs";
import { descriptionToText } from "../creep-routes/edit-link.mjs";

export { descriptionToText };

/** A published build as an exchange payload, ready to prefill the form. */
export function toExchangeBuild(build) {
  return {
    title: build.title ?? "",
    race: build.race,
    vsRaces: build.vsRaces ?? [],
    difficulty: build.difficulty ?? "beginner",
    patch: build.patch || undefined,
    tags: build.tags ?? [],
    summary: build.summary ?? "",
    author: build.author ?? "",
    authorDiscord: build.authorDiscord || undefined,
    sourceUrl: build.sourceUrl || undefined,
    videoUrl: build.videoUrl || undefined,
    supersedes: build.slug,
    steps: (build.steps ?? []).map((s) => ({
      time: s.time || undefined,
      // `?? undefined` for the same reason as a route's `start`: supply 0 is
      // meaningful, and Sanity's `null` for an unset field would fail the
      // schema's `z.number().optional()`.
      supply: s.supply ?? undefined,
      instruction: s.instruction,
      icon: s.icon || undefined,
    })),
    description: descriptionToText(build.description) || undefined,
  };
}

/** `/learn/builds/submit#build=<payload>`, or `undefined` when the build has
 *  no steps — the exchange schema requires at least one, and a dead link is
 *  worse than no button. */
export function buildEditHref(build) {
  const payload = toExchangeBuild(build);
  if (payload.steps.length === 0) return undefined;
  const json = JSON.stringify({ format: EXCHANGE_FORMAT_SINGLE, build: payload });
  return `/learn/builds/submit#${IMPORT_HASH_KEY}=${encodeForHash(json)}`;
}
