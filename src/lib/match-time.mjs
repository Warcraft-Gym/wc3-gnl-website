/** What a series shows in place of a time it does not carry.
 *
 * A series still to come is "TBD": somebody will agree a time. A series
 * already played that carries no time never had one written down, and the
 * league seasons imported from the old spreadsheets hold many of those, so
 * "TBD" would promise a time that is never coming.
 */
export const missingTime = (played) => (played ? "Not recorded" : "TBD");

/** The same answer split over the two lines a fixture row prints. */
export const missingTimeLines = (played) =>
  played ? { day: "Not", time: "recorded" } : { day: "TBD", time: "" };
