/**
 * CORS for the replay import API. Unlike the public builds API (open to
 * everyone), the replay parser costs real work per request, so only the
 * desktop overlay's own origins are allowed — never `*` — or anyone could
 * use it as a free parsing service. Plain JavaScript so `node --test` runs
 * the tests with no loader.
 */

/** The desktop overlay's origins: dev (`tauri.localhost`, `5173`, the overlay's Vite dev port) and the packaged app (`tauri://localhost`). */
const ALLOWED_ORIGINS = new Set([
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

/**
 * CORS headers for a request from the given `Origin` header value. An
 * allowlisted origin (exact match only) gets `Access-Control-Allow-Origin`
 * plus the rest of the preflight/response headers; any other origin, or no
 * origin at all, gets no `Access-Control-Allow-Origin` — but `Vary: Origin`
 * is always present so caches don't leak one origin's response to another.
 * @param {string | null | undefined} origin
 * @returns {Record<string, string>}
 */
export function replayCorsHeaders(origin) {
  if (origin != null && ALLOWED_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    };
  }
  return { Vary: "Origin" };
}
