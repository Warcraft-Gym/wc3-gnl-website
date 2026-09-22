import { NEUTRAL_ICONS as RAW_NEUTRAL_ICONS, rawcodeFromShopId, neutralIconFor as rawNeutralIconFor } from "./neutral-icons.mjs";

/**
 * Typed façade over `neutral-icons.mjs`'s pure, plain-JS implementation —
 * same split as `submission.mjs`/`submission.ts`: the `.mjs` file is what
 * `node --test` checks (see `neutral-icons.test.mjs`) with no loader, this
 * file is what `CreepMap`/`NeutralMarker` import for real types.
 */
export type NeutralIcon = { icon: string; label: string };

export const NEUTRAL_ICONS: Record<string, NeutralIcon> = RAW_NEUTRAL_ICONS;

export { rawcodeFromShopId };

export function neutralIconFor(shopId: string): NeutralIcon | null {
  return rawNeutralIconFor(shopId);
}
