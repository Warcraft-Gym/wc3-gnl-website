/**
 * Shared response headers for the public build-orders JSON API. Every
 * response (200, 404, OPTIONS) carries the same CORS headers so the desktop
 * overlay can fetch cross-origin from `file://` / `tauri://` contexts.
 */

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Headers for a successful (200) response: CORS + a 5-minute shared cache. */
export function okHeaders(): Record<string, string> {
  return {
    ...CORS_HEADERS,
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  };
}

/** Headers for a 404 response: CORS + a short cache (misses shouldn't stick around). */
export function notFoundHeaders(): Record<string, string> {
  return {
    ...CORS_HEADERS,
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
  };
}

/** Headers for an `OPTIONS` preflight response: CORS only, no body/cache. */
export function preflightHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}
