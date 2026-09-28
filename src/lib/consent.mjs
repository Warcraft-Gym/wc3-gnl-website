/** The reader's analytics consent.
 *
 * Stored in `localStorage`, not a cookie: a cookie to record that you refused
 * cookies is a poor joke, and storing the choice is the one bit of storage
 * that needs no permission because it exists to honour the refusal.
 *
 * Three states matter and they are not the same thing:
 *
 *   "granted"  they said yes
 *   "denied"   they said no
 *   null       they have not been asked, so the banner shows
 *
 * A missing value must never be read as consent. Everything here fails
 * closed: unparseable storage, a browser that throws on `localStorage`
 * (Safari in private mode does), or a value written by an older version all
 * come back null, and null means denied until they choose.
 */

export const CONSENT_KEY = "wg-analytics-consent";
export const GRANTED = "granted";
export const DENIED = "denied";

/** A stored value, or null when it is absent or not one of ours. */
export function parseConsent(raw) {
  return raw === GRANTED || raw === DENIED ? raw : null;
}

/** Reads the choice. Never throws: storage can be disabled entirely. */
export function readConsent(storage) {
  try {
    return parseConsent(storage?.getItem(CONSENT_KEY) ?? null);
  } catch {
    return null;
  }
}

/** Records a choice. Returns whether it stuck, so a caller can decide what
 *  to do when storage is unavailable (we still apply it for this page). */
export function writeConsent(storage, value) {
  const parsed = parseConsent(value);
  if (!parsed) return false;
  try {
    storage?.setItem(CONSENT_KEY, parsed);
    return true;
  } catch {
    return false;
  }
}

/** What gtag's Consent Mode should be told, given a stored choice. Only an
 *  explicit "granted" grants: null and "denied" are both denied. */
export function analyticsStorage(consent) {
  return consent === GRANTED ? GRANTED : DENIED;
}

/** The snippet that runs before `gtag('config')`, so a returning reader who
 *  has already agreed is not counted cookielessly for the first hit of every
 *  session. It has to be inline and synchronous for that reason: by the time
 *  React hydrates, the opening page_view has already gone. */
export function consentDefaultScript() {
  return `var c=null;try{c=localStorage.getItem('${CONSENT_KEY}');}catch(e){}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:c==='${GRANTED}'?'${GRANTED}':'${DENIED}'});`;
}
