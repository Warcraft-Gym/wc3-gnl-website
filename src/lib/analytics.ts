/**
 * Google Analytics configuration.
 *
 * Both values are read at build time, so they must be set in the Vercel
 * project (Settings → Environment Variables) before the deploy that should
 * start reporting. With no id, nothing is loaded at all — no script, no
 * requests, no cookies — so local development and preview deploys stay out of
 * the data by default.
 */

/** GA4 measurement id, e.g. `G-XXXXXXXXXX`. Unset means GA is off. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || undefined;

/**
 * Whether GA may use cookies and browser storage.
 *
 * Off by default, and deliberately so. The Gym's audience is largely UK and
 * European — the KotH page announces in UK time — and under UK GDPR and the
 * ePrivacy rules, analytics cookies need consent *before* they are set. There
 * is no consent banner on this site, and the privacy page says there is
 * nothing to consent to.
 *
 * So GA runs in Consent Mode v2 with storage denied: no `_ga` cookie, no
 * client id, no cross-visit identity. Google still receives cookieless pings,
 * so page views, referrers and countries are reported, but returning-visitor
 * and user-level metrics are modelled rather than measured.
 *
 * Set `NEXT_PUBLIC_GA_COOKIES=true` only once a consent banner exists and the
 * privacy page has been updated to match.
 */
export const GA_COOKIES_ALLOWED = process.env.NEXT_PUBLIC_GA_COOKIES === "true";
