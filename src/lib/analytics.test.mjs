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

test("nothing renders without a measurement id", () => {
  assert.match(component, /if \(!GA_MEASUREMENT_ID\) return null;/);
});

test("the id comes from the environment, never a literal in the source", () => {
  assert.match(config, /process\.env\.NEXT_PUBLIC_GA_ID/);
  assert.ok(
    !/G-[A-Z0-9]{8,}/.test(stripComments(component) + stripComments(config)),
    "a real measurement id is hardcoded in the source",
  );
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
