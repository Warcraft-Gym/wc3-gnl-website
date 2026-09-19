/**
 * The `?season=N` convention shared by the league pages. Without the param a
 * page shows the newest season, so the default links never carry it.
 */

export type SeasonSearchParams = { season?: string | string[] };

/** "?season=17" → 17; missing or malformed means the newest season. */
export function parseSeasonParam(raw?: string | string[]): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return value && Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Appends `?season=N` to a league path unless it already carries one. */
export function withSeason(href: string, seasonNumber?: number): string {
  if (seasonNumber == null || /[?&]season=/.test(href)) return href;
  return `${href}${href.includes("?") ? "&" : "?"}season=${seasonNumber}`;
}
