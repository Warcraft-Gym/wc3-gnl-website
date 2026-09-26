import "server-only";
import { isSanityConfigured, sanityClient } from "@/lib/content/sanity";

/**
 * The King of the Hill roll of honour.
 *
 * A collection rather than a field on the page: one small document a week.
 * The whole history is 156 events and the projection carries only a date and
 * a handful of names, so it is fetched in one go and grouped in render.
 */

export type KothCrown = { bracket: string; player: string };
export type KothResult = { date: string; winners: KothCrown[]; note?: string };

const PROJECTION = `{ date, "winners": coalesce(winners[]{ bracket, player }, []), note }`;

export async function getKothResults(): Promise<KothResult[]> {
  if (!isSanityConfigured()) return [];
  const client = sanityClient();
  if (!client) return [];
  try {
    return await client.fetch<KothResult[]>(
      `*[_type == "kothResult" && defined(date)] | order(date desc) ${PROJECTION}`,
      {},
      { next: { revalidate: 300 } },
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[koth] results fetch failed -", String(err));
    }
    return [];
  }
}
