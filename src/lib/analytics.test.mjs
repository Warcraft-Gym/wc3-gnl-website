/**
 * Google Analytics is configured in a way that is easy to break silently.
 *
 * Two things matter and neither shows up as an error:
 *
 *   1. The consent defaults must be pushed *before* `config`. gtag applies
 *      whatever posture is in place when config runs, so moving the consent
 *      call below it would let the first hit through with storage granted —
 *      a cookie set on a site whose privacy page says it sets none.
 *   2. Nothing may load without a measurement id, so local development and
 *      preview deploys stay out of the data.
 *
 * These read the component source rather than rendering it, so they run in
 * the same plain `node --test` as everything else.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const component = readFileSync(join(ROOT, "src/components/analytics/GoogleAnalytics.tsx"), "utf8");
const config = readFileSync(join(ROOT, "src/lib/analytics.ts"), "utf8");
const privacy = readFileSync(join(ROOT, "src/app/(site)/privacy/page.tsx"), "utf8");

/** Comments explain the format with a placeholder ("G-XXXXXXXXXX"), which is
 *  not a hardcoded id. Strip them before looking for one. */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");

test("nothing renders unless analytics are enabled", () => {
  assert.match(component, /if \(!GA_ENABLED\) return null;/);
});

test("only the production deployment reports", () => {
  // A Vercel preview is also a production *build*, so NODE_ENV alone would
  // put every branch push in the same property as real traffic.
  assert.match(config, /process\.env\.NODE_ENV === "production"/);
  assert.match(config, /NEXT_PUBLIC_VERCEL_ENV !== "preview"/);
  assert.match(config, /NEXT_PUBLIC_VERCEL_ENV !== "development"/);
});

test("the id is overridable, and is the only literal allowed", () => {
  // The measurement id is public — it is in the page source of every page —
  // so it is a default here rather than a dashboard step, like the Sanity
  // project id. What must not happen is a second one appearing somewhere
  // else, or the override being dropped.
  assert.match(config, /process\.env\.NEXT_PUBLIC_GA_ID \?\? DEFAULT_GA_ID/);
  const ids = new Set((stripComments(config) + stripComments(component)).match(/G-[A-Z0-9]{8,}/g) ?? []);
  assert.equal(ids.size, 1, `expected exactly one measurement id in the source, found ${[...ids].join(", ") || "none"}`);
});

test("consent defaults are declared before config", () => {
  const consent = component.indexOf("'consent', 'default'");
  const cfg = component.indexOf("'config'");
  assert.ok(consent !== -1 && cfg !== -1, "both calls must exist");
  assert.ok(consent < cfg, "consent must be pushed before config or the first hit uses granted storage");
});

test("storage is denied unless cookies are explicitly allowed", () => {
  assert.match(config, /GA_COOKIES_ALLOWED = process\.env\.NEXT_PUBLIC_GA_COOKIES === "true"/);
  assert.match(component, /GA_COOKIES_ALLOWED \? "granted" : "denied"/);
  assert.match(component, /client_storage: 'none'/, "the cookieless branch must switch client storage off");
});

test("advertising signals are denied whatever the cookie setting", () => {
  for (const key of ["ad_storage", "ad_user_data", "ad_personalization"]) {
    assert.match(component, new RegExp(`${key}: 'denied'`), key);
  }
});

test("the privacy page mentions Google Analytics, so it cannot be added quietly", () => {
  assert.match(privacy, /Google Analytics/);
  assert.ok(
    !/They set no cookies, store no personal data, and do not keep your IP address\./.test(privacy),
    "the old claim predates Google Analytics and is no longer accurate as written",
  );
});
