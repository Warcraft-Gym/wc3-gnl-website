"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DENIED, GRANTED, readConsent, writeConsent } from "@/lib/consent.mjs";

/** Subscribes to nothing: the value never changes after hydration. The
 *  hydration-safe way to render one thing on the server and another in the
 *  browser, with no state-setting effect and no mismatch warning. */
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * The analytics consent banner.
 *
 * Shown only to a reader who has not chosen yet. Declining is one click and
 * sits beside accepting, not buried: the point is a real choice, and a
 * refusal has to be as easy as agreement for the consent to mean anything.
 *
 * Nothing renders on the server, because only the browser knows whether a
 * choice exists. With JavaScript off there is no banner and no analytics
 * storage either, which is the correct pair.
 *
 * `enabled` comes from the layout: on a deployment where analytics are off
 * (local work, previews) there is nothing to consent to, and asking anyway
 * would be theatre.
 */
export function ConsentBanner({ enabled }: { enabled: boolean }) {
  const hydrated = useSyncExternalStore(subscribe, onClient, onServer);
  const [choice, setChoice] = useState<string | null>(null);

  const decide = useCallback((value: string) => {
    const storage = typeof window === "undefined" ? undefined : window.localStorage;
    writeConsent(storage, value);
    // Tell gtag straight away so the decision applies to this page view,
    // not only to the next one. `gtag` is defined by the init script; if
    // analytics are off for this deployment it simply is not there.
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.("consent", "update", { analytics_storage: value === GRANTED ? GRANTED : DENIED });
    setChoice(value);
  }, []);

  if (!enabled || !hydrated) return null;
  // `choice` covers the click; `readConsent` covers a reader who chose before.
  if (choice || readConsent(window.localStorage)) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-heading"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="panel mx-auto flex max-w-[64rem] flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="min-w-0 flex-1">
          <h2 id="consent-heading" className="font-display text-sm font-bold uppercase tracking-[0.12em] text-fg">
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
