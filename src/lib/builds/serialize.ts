import { gameIconSrc } from "@/lib/builds/icons";
import type { BuildOrder, BuildStep } from "@/lib/builds/types";

/**
 * Public JSON API DTO. Same shape as `BuildOrder`/`BuildStep`, minus
 * `reviewStatus` (never exposed — the data layer already serves
 * approved-only) and with each step gaining an absolute `iconUrl` so a
 * desktop overlay on a different origin can load the art directly.
 */

export type ApiBuildStep = BuildStep & { iconUrl?: string };

export type ApiBuild = Omit<BuildOrder, "steps" | "description"> & {
  steps: ApiBuildStep[];
  description?: BuildOrder["description"];
};

export type ApiBuildListItem = Omit<ApiBuild, "description">;

function toApiStep(step: BuildStep, origin: string): ApiBuildStep {
  if (!step.icon) return { ...step };
  return { ...step, iconUrl: `${origin}${gameIconSrc(step.icon)}` };
}

/** Full detail DTO — includes `description` as stored (Portable Text blocks
 *  or plain strings), the client decides how to render it. */
export function toApiBuild(build: BuildOrder, origin: string): ApiBuild {
  return {
    ...build,
    steps: build.steps.map((step) => toApiStep(step, origin)),
  };
}

/** List DTO — omits `description` to keep the list payload small. */
export function toApiBuildListItem(build: BuildOrder, origin: string): ApiBuildListItem {
  const full = toApiBuild(build, origin);
  return Object.fromEntries(
    Object.entries(full).filter(([key]) => key !== "description"),
  ) as ApiBuildListItem;
}
