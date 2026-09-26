"use client";

import { useSyncExternalStore } from "react";
import { LISTED_ZONES, formatInZone } from "@/lib/koth/next-event";

/** Subscribes to nothing: the value never changes after hydration. This is
 *  the hydration-safe way to render one thing on the server and another in
 *  the browser — `false` during SSR and the first client render, `true`
 *  afterwards — without a state-setting effect or a mismatch warning. */
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * "In your time zone" for the next King of the Hill.
 *
 * The page prints UK, Central Europe and US Eastern, which covers most of the
 * Gym but leaves anyone else doing arithmetic. Only the browser knows where
 * the reader is, so this is the one thing on the page that cannot be rendered
 * on the server.
 *
 * It degrades honestly: with JavaScript off, or before hydration, nothing is
 * shown and the three fixed zones stand on their own. It also stays quiet
 * when the reader is already in one of those three, rather than telling them
 * the time they can already see.
 */
export function LocalEventTime({ iso }: { iso: string }) {
  const hydrated = useSyncExternalStore(subscribe, onClient, onServer);
  if (!hydrated) return null;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZone || LISTED_ZONES.includes(timeZone)) return null;

  const local = formatInZone(iso, timeZone);
  if (!local) return null;

  return (
    <p className="mt-2 text-sm text-muted">
      In your time zone:{" "}
      <span className="text-fg">
        {local.day}, {local.time}
      </span>{" "}
      <span className="text-faint">{local.zone}</span>
    </p>
  );
}
