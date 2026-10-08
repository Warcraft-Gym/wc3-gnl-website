import "server-only";
import { apiGetAll, isApiConfigured } from "@/lib/api/client";
import * as impl from "./results.mjs";

/**
 * The King of the Hill roll of honour, read from the league backend.
 *
 * `GET /koth/winners` answers every published closed night with the king each
 * bracket ended with: one statement, about 55 KB for five years of nights,
 * and the backend's edge keeps it an hour. The site keeps its copy for a day
 * (the client's default window), so the backend sees about one read a day.
 */

export type KothCrown = { bracket: string; player: string; userId: number | null; country: string | null };
export type KothResult = { id: number; date: string; winners: KothCrown[] };

type RawWinner = {
  bracket: string | null;
  lower_bound: number | null;
  name: string | null;
  user_id: number | null;
  country: string | null;
};
type RawNight = { event_id: number; date: string | null; date_label: string | null; winners: RawWinner[] };

const toResults = impl.toResults as (nights: RawNight[]) => KothResult[];

export async function getKothResults(): Promise<KothResult[]> {
  if (!isApiConfigured()) return [];
  try {
    return toResults(await apiGetAll<RawNight>("/koth/winners"));
  } catch (err) {
    console.warn("[koth] winners read failed -", String(err));
    return [];
  }
}
