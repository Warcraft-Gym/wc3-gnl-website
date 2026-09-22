/** The build exchange format's constants and URL-hash codec, in plain
 *  JavaScript, so `.mjs` modules (which `node --test` loads without a
 *  TypeScript loader) can share exactly what `exchange.ts` uses rather than
 *  keeping a second copy that could drift. `exchange.ts` re-exports these. */

export const EXCHANGE_FORMAT_SINGLE = "wc3gym-build";
export const EXCHANGE_FORMAT_MULTI = "wc3gym-builds";

/** Deep link key: `#build=<base64url of the export JSON>`. */
export const IMPORT_HASH_KEY = "build";

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
