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
import { consentDefaultScript } from "./consent.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const component = readFileSync(join(ROOT, "src/components/analytics/GoogleAnalytics.tsx"), "utf8");
const config = readFileSync(join(ROOT, "src/lib/analytics.ts"), "utf8");
const privacy = readFileSync(join(ROOT, "src/app/(site)/privacy/page.tsx"), "utf8");
const consent = readFileSync(join(ROOT, "src/lib/consent.mjs"), "utf8");
const banner = readFileSync(join(ROOT, "src/components/analytics/ConsentBanner.tsx"), "utf8");
const geo = readFileSync(join(ROOT, "src/app/api/geo/route.ts"), "utf8");

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

test("the consent default is emitted before config", () => {
  // gtag applies whatever posture is in place when config runs, so the
  // default has to come first or the opening page_view uses the wrong one.
  const dflt = component.indexOf("consentDefaultScript()");
  const cfg = component.indexOf("'config'");
  assert.ok(dflt !== -1 && cfg !== -1, "both must exist");
  assert.ok(dflt < cfg, "the consent default must precede config");
});

test("the default reads the reader's stored choice, it does not hardcode one", () => {
  // Hardcoding "denied" and upgrading after hydration would lose the first
  // hit of every session for a reader who already agreed. Asserted on the
  // emitted script rather than the source, which builds it from constants.
  const js = consentDefaultScript();
  assert.match(js, /localStorage\.getItem/);
  assert.match(js, /analytics_storage:c==='granted'\?'granted':'denied'/);
});

test("advertising signals are denied and nothing can grant them", () => {
  const js = consentDefaultScript();
  for (const key of ["ad_storage", "ad_user_data", "ad_personalization"]) {
    assert.match(js, new RegExp(`${key}:'denied'`), key);
  }
  assert.ok(
    !/ad_storage['"]?\s*:\s*['"]granted/.test(consent + banner + component),
    "no code path may grant an advertising signal",
  );
});

test("declining is offered as plainly as accepting", () => {
  // Consent that is harder to refuse than to give is not consent.
  assert.match(banner, /decide\(DENIED\)/);
  assert.match(banner, /decide\(GRANTED\)/);
});

test("the banner is absent where analytics are off", () => {
  assert.match(banner, /if \(!enabled \|\| !ask\) return null;/);
});

test("not asking outside the EEA still grants, rather than leaving analytics off", () => {
  // The trap in geo-gating: skip the banner and forget the grant, and you
  // get no banner and no data, which is worse than either alone.
  assert.match(banner, /consentRequired === false\) apply\(GRANTED\)/);
});

test("a failed or ambiguous geo lookup asks", () => {
  assert.match(banner, /\.catch\(\(\) => live && setAsk\(true\)\)/);
  assert.match(banner, /else setAsk\(true\)/);
});

test("the geo lookup is never cached", () => {
  // A cached "no consent needed" served to an EU reader is the one mistake
  // this must not make.
  assert.match(banner, /cache: "no-store"/);
  assert.match(geo, /"cache-control": "no-store"/);
  assert.match(geo, /force-dynamic/);
});

test("the privacy page mentions Google Analytics, so it cannot be added quietly", () => {
  assert.match(privacy, /Google Analytics/);
  assert.ok(
    !/They set no cookies, store no personal data, and do not keep your IP address\./.test(privacy),
    "the old claim predates Google Analytics and is no longer accurate as written",
  );
});
