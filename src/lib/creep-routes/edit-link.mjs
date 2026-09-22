/** Builds the "Suggest an update" link for a published creep route.
 *
 * The site has no accounts, so an author updating a route resubmits it and
 * names the one it replaces (see `docs/creep-routes.md`, "Editing a submitted
 * route"). Typing the whole thing again would make that a bad deal, so the
 * link carries the current route as an exchange payload in the URL hash —
 * the same `#route=` prefill the submit form already reads for replay and
 * overlay imports — plus `supersedes`, so the form arrives filled in *and*
 * already pointing at the route being replaced.
 *
 * The hash never reaches the server, so the payload size only has to suit a
 * browser; a long route with notes is a few kilobytes.
 */
import { EXCHANGE_FORMAT, IMPORT_HASH_KEY, encodeForHash } from "./exchange-codec.mjs";

/** Portable Text (or a plain string array) back to the plain text the submit
 *  form's Notes field holds. Only the shapes this project writes are
 *  handled: `toPortableText` produces blocks of spans, and fixtures use
 *  string arrays. Anything else contributes nothing rather than `[object
 *  Object]`. */
export function descriptionToText(description) {
  if (!Array.isArray(description)) return "";
  return description
    .map((block) => {
      if (typeof block === "string") return block;
      if (block && Array.isArray(block.children)) {
        return block.children.map((c) => (c && typeof c.text === "string" ? c.text : "")).join("");
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/** A published route as an exchange payload, ready to prefill the form. */
export function toExchangeRoute(route) {
  return {
    title: route.title ?? "",
    map: route.map?.slug ?? "",
    race: route.race,
    vsRaces: route.vsRaces ?? [],
    level: route.level ?? "standard",
    // `?? undefined`, not `|| undefined`: start 0 is a real spawn index.
    // Sanity returns `null` for a field that was never set, and `null`
    // serialises where `undefined` is dropped — so a bare passthrough put
    // `"start": null` in the payload and the schema rejected the lot.
    start: route.start ?? undefined,
    hero: route.hero || undefined,
    build: route.build?.slug || undefined,
    patch: route.patch || undefined,
    tags: route.tags ?? [],
    summary: route.summary ?? "",
    author: route.author ?? "",
    authorDiscord: route.authorDiscord || undefined,
    sourceUrl: route.sourceUrl || undefined,
    supersedes: route.slug,
    stops: (route.stops ?? []).map((s) => ({
      campId: s.campId ?? null,
      action: s.action || undefined,
      units: s.units?.length ? s.units.map((u) => ({ icon: u.icon, count: u.count })) : undefined,
      note: s.note || undefined,
      condition: s.condition || undefined,
    })),
    description: descriptionToText(route.description) || undefined,
  };
}

/** `/learn/creep-routes/submit#route=<payload>` for this route, or
 *  `undefined` when there is nothing to prefill — a route with no stops
 *  cannot satisfy the exchange schema, and a dead link is worse than no
 *  button. */
export function routeEditHref(route) {
  const payload = toExchangeRoute(route);
  if (payload.stops.length === 0) return undefined;
  const json = JSON.stringify({ format: EXCHANGE_FORMAT, route: payload });
  return `/learn/creep-routes/submit#${IMPORT_HASH_KEY}=${encodeForHash(json)}`;
}
