import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Auth for the /admin CMS: one shared password (scrypt-hashed in the env,
 * never stored in plaintext) and a signed, expiring session cookie. No user
 * accounts, no OAuth, just enough to keep the write-token-backed CMS away
 * from the public internet. See src/proxy.ts for where this is enforced.
 */

export const SESSION_COOKIE = "gnl_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const SECRET = process.env.ADMIN_SESSION_SECRET;
const PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

export function isAdminConfigured(): boolean {
  return Boolean(SECRET && PASSWORD_HASH);
}

function sign(payload: string): string {
  if (!SECRET) throw new Error("ADMIN_SESSION_SECRET is not configured");
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

/** Cookie value is `${expiryEpochMs}.${hmac}` — no user data to decode. */
export function createSessionCookieValue(): string {
  const payload = String(Date.now() + SESSION_TTL_MS);
  return `${payload}.${sign(payload)}`;
}

export function isSessionValid(cookieValue?: string | null): boolean {
  if (!cookieValue || !SECRET) return false;
  const [payload, sig] = cookieValue.split(".");
  if (!payload || !sig) return false;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

/** ADMIN_PASSWORD_HASH is "<salt-hex>:<hash-hex>", see scripts/hash-admin-password.mjs. */
export function verifyPassword(password: string): boolean {
  if (!PASSWORD_HASH) return false;
  const [saltHex, hashHex] = PASSWORD_HASH.split(":");
  if (!saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Per-IP login throttle. In-memory (per serverless instance) is enough for a
// single shared admin password; it just slows down brute-forcing.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function isLoginThrottled(ip: string): boolean {
  const entry = attempts.get(ip);
  return Boolean(entry && Date.now() < entry.resetAt && entry.count >= MAX_ATTEMPTS);
}

export function recordLoginAttempt(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}
