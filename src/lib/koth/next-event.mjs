/** Formatting for the "next event" line.
 *
 * The old page stored "January 3, 2025 at 2 PM EST / 8 PM CET" as text, in
 * two halves someone had to keep in step by hand — through daylight saving,
 * where US and European clocks change on different weekends and the gap
 * between the two zones is five hours for most of the year but six for a
 * fortnight in spring and autumn. One instant plus `Intl` cannot drift.
 */

/** The zones the event is announced in. The first is the anchor: its day is
 *  the day the page names, because that is the clock the organiser runs on. */
const ZONES = [
  { label: "UK", tz: "Europe/London" },
  { label: "Central Europe", tz: "Europe/Berlin" },
  { label: "US Eastern", tz: "America/New_York" },
];

/** True when the stored instant is in the past — an event that has happened
 *  should not still be advertised as "next". */
export function isPast(iso, now = new Date()) {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? false : t < now.getTime();
}

/** `{ day, times: [{ label, time }] }`, or null when the date is unusable.
 *  The day is rendered in the first zone, the one the event is anchored to. */
export function formatNextEvent(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);

  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ZONES[0].tz,
  }).format(d);

  const times = ZONES.map(({ label, tz }) => ({
    label,
    time: new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }).format(d),
  }));

  return { day, times };
}
