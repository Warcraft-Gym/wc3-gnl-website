import { FIXTURE_MAPS as MAPS, FIXTURE_ROUTES as ROUTES } from "./fixtures.mjs";
import type { CreepMap, CreepRoute } from "./types";

/** Typed view of `fixtures.mjs` (kept as plain JS so `node --test` can check
 *  it with no loader — see `fixtures.test.mjs`). Seed maps and routes for
 *  local dev and as the fallback when Sanity is unreachable or empty. */
export const FIXTURE_MAPS: CreepMap[] = MAPS;
// fixtures.mjs is plain JS (its string-literal fields like `race`/`level`
// infer as `string`, not the narrower union types); the runtime shape is
// checked by fixtures.test.mjs, so the cast here is safe.
export const FIXTURE_ROUTES: CreepRoute[] = ROUTES as unknown as CreepRoute[];
