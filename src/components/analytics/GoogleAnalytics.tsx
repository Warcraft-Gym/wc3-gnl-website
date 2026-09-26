import Script from "next/script";
import { GA_COOKIES_ALLOWED, GA_ENABLED, GA_MEASUREMENT_ID } from "@/lib/analytics";

/**
 * Google Analytics 4, loaded only when a measurement id is configured.
 *
 * `afterInteractive` keeps it off the critical path: the tag is fetched once
 * the page is usable, so it does not compete with the hero image for the LCP
 * the performance budget cares about.
 *
 * Consent Mode v2 defaults are set *before* `config`, which is the part that
 * matters — gtag applies whatever posture is in place at config time, so
 * declaring consent afterwards would let the first hit through with storage
 * already granted. See `GA_COOKIES_ALLOWED` for why the default is denied.
 */
export function GoogleAnalytics() {
  if (!GA_ENABLED) return null;

  const storage = GA_COOKIES_ALLOWED ? "granted" : "denied";

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
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: '${storage}'
});
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', {
  anonymize_ip: true${GA_COOKIES_ALLOWED ? "" : ",\n  client_storage: 'none'"}
});
        `.trim()}
      </Script>
    </>
  );
}
