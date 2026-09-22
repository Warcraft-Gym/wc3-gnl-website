/** The exchange format's constants and URL-hash codec, in plain JavaScript.
 *
 * Split out of `exchange.ts` so `.mjs` modules — which `node --test` loads
 * with no TypeScript loader — can use them: `edit-link.mjs` builds the
 * "Suggest an update" href from exactly the same constants the submit form
 * decodes with, rather than a second copy that could drift.
 *
 * `exchange.ts` re-exports all three, so existing importers are unaffected.
 */

export const EXCHANGE_FORMAT = "wc3gym-creep-route";

/** Deep link key: `#route=<base64url of the export JSON>`. */
export const IMPORT_HASH_KEY = "route";

export function encodeForHash(json) {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeFromHash(value) {
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
