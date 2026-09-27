"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DENIED, GRANTED, readConsent, writeConsent } from "@/lib/consent.mjs";

/** Tell gtag, and remember it. Storage may be unavailable (Safari in private
 *  mode throws); the update still applies to this page view either way. */
function apply(value: string) {
  const storage = typeof window === "undefined" ? undefined : window.localStorage;
  writeConsent(storage, value);
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  w.gtag?.("consent", "update", { analytics_storage: value === GRANTED ? GRANTED : DENIED });
}

/**
 * The analytics consent banner, shown where consent is legally required.
 *
 * Two outcomes, and the second is the one that is easy to get wrong:
 *
 *   - in the EEA, the UK and Switzerland the reader is asked, and nothing is
 *     stored until they answer;
 *   - everywhere else consent is **granted explicitly**, because the banner
 *     not showing must not leave analytics switched off. Skipping the ask and
 *     forgetting the grant would give the worst of both: no banner and no
 *     data, which is exactly the state this change set out to fix.
 *
 * The country comes from `/api/geo` rather than from the page, so the pages
 * themselves stay cached. That costs one request and means the banner appears
 * a moment after the page rather than with it.
 *
 * Declining sits beside accepting, equally weighted. Consent that is harder
 * to refuse than to give is not consent.
 */
export function ConsentBanner({ enabled }: { enabled: boolean }) {
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Already answered, on this visit or a previous one: nothing to do, and
    // the inline Consent Mode default has already read it.
    if (readConsent(window.localStorage)) return;

    let live = true;
    fetch("/api/geo", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((geo) => {
        if (!live) return;
        // A failed lookup asks rather than assumes. `consentRequired` on the
        // server already defaults that way; this covers the request itself
        // failing.
        if (geo?.consentRequired === false) apply(GRANTED);
        else setAsk(true);
      })
      .catch(() => live && setAsk(true));
    return () => {
      live = false;
    };
  }, [enabled]);

  const decide = useCallback((value: string) => {
    apply(value);
    setAsk(false);
  }, []);

  if (!enabled || !ask) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-heading"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="panel mx-auto flex max-w-[64rem] flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="min-w-0 flex-1">
          <h2 id="consent-heading" className="font-heading text-sm font-bold text-fg">
            Analytics
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            May we count your visit? It tells us which guides are worth writing. No advertising, no
            profile, nothing shared. Decline and the site works exactly the same.{" "}
            <Link href="/privacy" className="text-gold underline-offset-2 hover:underline">
              What we collect
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => decide(DENIED)}>
            Decline
          </Button>
          <Button type="button" size="sm" onClick={() => decide(GRANTED)}>
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}
