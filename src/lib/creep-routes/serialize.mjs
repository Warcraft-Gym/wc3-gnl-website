/**
 * Pure JSON-API DTO mapping, plain JS so `node --test` can check it with no
 * loader (see `serialize.test.mjs`) — same split as `submission.mjs`/
 * `derive.mjs` (code-a.md, "Should fix": no test existed for these DTOs
 * before). `iconSrc` and `deriveRouteFn` are injected rather than imported
 * directly: `gameIconSrc` lives in a `.ts` module (`@/lib/builds/icons`) a
 * plain `node --test` run can't resolve without a bundler, and passing
 * `deriveRoute` in lets `serialize.ts`'s typed façade hand in its own
 * typed `derive.ts` wrapper. `serialize.ts` re-exports typed wrappers with
 * these two bound to the real implementations for actual callers.
 */

export function toApiStop(stop, origin, iconSrc) {
  const { units, ...rest } = stop;
  return {
    ...rest,
    ...(units?.length
      ? { units: units.map((u) => ({ ...u, iconUrl: `${origin}${iconSrc(u.icon)}` })) }
      : {}),
  };
}

export function absoluteMinimapUrl(map, origin) {
  return map.minimapUrl.startsWith("http") ? map.minimapUrl : `${origin}${map.minimapUrl}`;
}

/** List DTO — a deliberately explicit, narrower field set than the full
 *  route: no `description`, `build`, `authorDiscord`, `maintainer`,
 *  `sourceUrl`, `patch` — those are detail-only (`toApiRoute`). `tags`
 *  defaults to `[]` when the route has none (F010: the field is optional
 *  on the domain type, fixtures/pre-F010 documents may not carry it). */
export function toApiRouteListItem(route, origin, iconSrc) {
  return {
    slug: route.slug,
    title: route.title,
    race: route.race,
    vsRaces: route.vsRaces,
    level: route.level,
    map: { slug: route.map.slug, name: route.map.name, mapVersion: route.mapVersion },
    start: route.start,
    hero: route.hero,
    summary: route.summary,
    author: route.author,
    tags: route.tags ?? [],
    stops: route.stops.map((stop) => toApiStop(stop, origin, iconSrc)),
    featured: route.featured,
    publishedAt: route.publishedAt,
    updatedAt: route.updatedAt,
  };
}

/** Full detail DTO — adds `description`, the optional companion `build`
 *  link, and `derived` (the running hero level/xp per stop, from
 *  `deriveRouteFn(route, map)` — `map` is the route's own map, already
 *  resolved by the caller). */
export function toApiRoute(route, map, origin, iconSrc, deriveRouteFn) {
  const listItem = toApiRouteListItem(route, origin, iconSrc);
  const derived = deriveRouteFn(route, map);
  return {
    ...listItem,
    description: route.description,
    // Detail-only, like `sourceUrl`: the list page flags a video with an
    // icon from its own data, so the list payload stays small.
    videoUrl: route.videoUrl,
    sourceUrl: route.sourceUrl,
    build: route.build,
    derived: {
      stops: derived.stops.map((s) => ({
        heroLevelAfter: s.heroLevelAfter,
        xpAfter: s.xpAfter,
      })),
      finalLevel: derived.finalLevel,
      finalXp: derived.finalXp,
    },
  };
}

/** Map list DTO — `camps` is a *count*, not the full array, to keep the
 *  map list payload small. */
export function toApiMapListItem(map, origin) {
  return {
    slug: map.slug,
    name: map.name,
    mapVersion: map.mapVersion,
    w3cMapId: map.w3cMapId,
    image: map.image,
    camps: map.camps.length,
    minimapUrl: absoluteMinimapUrl(map, origin),
  };
}

/** Map detail DTO — the entire catalogue, `minimapUrl` made absolute. A
 *  full spread, so `camps[].creeps[].icon` and `camps[].drops` (F011) pass
 *  through untouched — see `serialize.test.mjs`. */
export function toApiMap(map, origin) {
  return { ...map, minimapUrl: absoluteMinimapUrl(map, origin) };
}
