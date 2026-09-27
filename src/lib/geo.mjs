/** Where a consent banner is legally required.
 *
 * The EEA (the EU 27 plus Iceland, Liechtenstein and Norway) and the UK
 * require consent *before* a non-essential cookie is set, under the ePrivacy
 * rules alongside GDPR. Switzerland is included too: its revised FADP is a
 * transparency regime rather than a consent one, but the cost of asking is a
 * banner and the cost of being wrong is not, so it goes in the list.
 *
 * Everywhere else, analytics cookies are allowed without asking first, so
 * those readers are granted and never see a banner.
 *
 * An unknown country is treated as requiring consent. The header is missing
 * on local work and anywhere that is not Vercel, and "I could not tell" must
 * never quietly become "no permission needed".
 */

/** ISO 3166-1 alpha-2, as Vercel's `x-vercel-ip-country` sends them. */
export const CONSENT_REQUIRED_COUNTRIES = new Set([
  // EU 27
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  // EEA, not EU
  "IS", "LI", "NO",
  // United Kingdom, and Switzerland by choice
  "GB", "CH",
]);

/** Whether this reader must be asked before anything is stored. */
export function consentRequired(country) {
  if (typeof country !== "string") return true;
  const code = country.trim().toUpperCase();
  if (code.length !== 2) return true;
  return CONSENT_REQUIRED_COUNTRIES.has(code);
}
