import * as impl from "./current-kings.mjs";
import type { KothResult } from "./results";

/** Typed façade over the pure plain-JS implementation, so `node --test` runs
 *  the tests with no loader while the page gets types. */

export type CurrentKings = { date: string; kings: { bracket: string; player: string }[] };

export const currentKings = impl.currentKings as (results: KothResult[]) => CurrentKings | null;
