/**
 * Google Analytics configuration.
 *
 * The measurement id is not a secret — it is sent to the browser on every
 * page — so it is defaulted here rather than kept in the dashboard, the same
 * way the Sanity project id is a publishable default. `NEXT_PUBLIC_GA_ID`
 * still overrides it, for a staging property.
 */

/** The Gym's GA4 property. Public: it appears in the page source. */
const DEFAULT_GA_ID = "G-RG6WD9DXHT";

/** GA4 measurement id. Empty string switches Google Analytics off entirely. */
export const GA_MEASUREMENT_ID = (process.env.NEXT_PUBLIC_GA_ID ?? DEFAULT_GA_ID).trim();

/**
 * Only the production deployment reports.
 *
 * `NODE_ENV` alone is not enough: a Vercel preview build is also a production
 * build, so preview deploys and every branch push would land in the same
 * property as real traffic. `NEXT_PUBLIC_VERCEL_ENV` separates them.
 *
 * It fails *open*: if the system variable is not exposed (the Vercel project
 * setting can be turned off), reporting still happens rather than silently
 * never starting — a missing number is easier to notice than a wrong one.
 */
export const GA_ENABLED =
  Boolean(GA_MEASUREMENT_ID) &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview" &&
  process.env.NEXT_PUBLIC_VERCEL_ENV !== "development";

/**
 * Analytics storage is now the reader's decision, not a build-time flag.
 * `NEXT_PUBLIC_GA_COOKIES` is gone: the banner records a choice, the inline
 * Consent Mode default reads it, and `src/lib/consent.mjs` owns the states.
 * Until someone chooses, storage is denied and GA sets nothing.
 */
