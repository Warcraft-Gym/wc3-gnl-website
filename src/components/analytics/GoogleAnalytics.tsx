import Script from "next/script";
import { GA_ENABLED, GA_MEASUREMENT_ID } from "@/lib/analytics";
import { consentDefaultScript } from "@/lib/consent.mjs";

/**
 * Google Analytics 4, loaded only when analytics are enabled for this
 * deployment (see `GA_ENABLED`).
 *
 * `afterInteractive` keeps it off the critical path: the tag is fetched once
 * the page is usable, so it does not compete with the hero image for the LCP
 * the performance budget cares about.
 *
 * Consent Mode v2 defaults are declared **before** `config`, which is the
 * part that matters. gtag applies whatever posture is in place when config
 * runs, so declaring consent afterwards would let the opening page_view
 * through under the wrong one.
 *
 * The default reads the reader's stored choice synchronously rather than
 * hardcoding "denied" and letting the banner upgrade it after hydration. By
 * the time React hydrates the first hit has already been sent, so a returning
 * reader who agreed months ago would have the opening page_view of every
 * session counted cookielessly. Advertising signals are denied outright and
 * are never upgraded: the site runs no ads and asks for no permission to.
 */
export function GoogleAnalytics() {
  if (!GA_ENABLED) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
${consentDefaultScript()}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
        `.trim()}
      </Script>
    </>
  );
}
