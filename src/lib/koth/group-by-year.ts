import * as impl from "./group-by-year.mjs";
import type { KothResult } from "./results";

/**
 * Typed façade over the pure plain-JS implementation — same split as
 * `filter.ts`/`filter.mjs`, so `node --test` can run the tests with no loader
 * while the page still gets types.
 */

export type KothYear = {
  year: string;
  results: KothResult[];
  crownings: number;
};

export const groupByYear = impl.groupByYear as (results: KothResult[]) => KothYear[];
export const shortDate = impl.shortDate as (iso: string) => string;
