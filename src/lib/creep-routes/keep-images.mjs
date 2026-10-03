/**
 * Pictures on a resubmitted route. The browser never sends an image asset: a stop from a
 * "Suggest an update" link names the published stop it updates (`key`, that stop's `_key`),
 * and the server copies that stop's `images` from the route the submission replaces.
 */

/** `stops` (parsed submission stops) with `images` copied from `oldStops` (the replaced route's raw
 *  Sanity stops, splits' paths included). A stop gets pictures only when its `key` names an old stop
 *  with pictures, and only the first stop that names it; a new stop or an unknown key gets none. */
export function keepImages(stops, oldStops) {
  const byKey = new Map();
  for (const s of oldStops ?? []) {
    for (const t of [s, ...(s.arms ?? []).flatMap((a) => a.stops ?? [])]) {
      if (t?._key && t.images?.length) byKey.set(t._key, t.images);
    }
  }
  const keep = (s) => {
    const images = s.key ? byKey.get(s.key) : undefined;
    if (!images) return s;
    byKey.delete(s.key);
    return { ...s, images };
  };
  return stops.map((s) => (s.split ? { ...s, split: { ...s.split, arms: s.split.arms.map((a) => ({ ...a, stops: a.stops.map(keep) })) } } : keep(s)));
}
