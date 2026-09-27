import * as impl from "./bracket-art.mjs";

/** Typed façade over the pure plain-JS implementation, so `node --test` runs
 *  the tests with no loader while the page gets types. */

export const bracketArt = impl.bracketArt as (bracket: string) => string;
export const bracketFloor = impl.bracketFloor as (bracket: string) => number | null;
