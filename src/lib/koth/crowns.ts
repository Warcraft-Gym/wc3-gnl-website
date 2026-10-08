import * as impl from "./crowns.mjs";
import type { KothCrown, KothResult } from "./results";

/** Typed façade over the pure plain-JS implementation, so `node --test` runs
 *  the tests with no loader while the page gets types. */

export type CrownedPlayer = { player: string; country: string | null; crowns: number; first: string; last: string };

export const topFirst = impl.topFirst as (winners: KothCrown[]) => KothCrown[];
export const mostCrowns = impl.mostCrowns as (results: KothResult[]) => CrownedPlayer[];
