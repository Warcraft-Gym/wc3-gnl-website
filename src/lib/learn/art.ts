import type { LearnCategory } from "./data";

/** Painted emblem for each topic hub; races use the Reforged crests. */
const TOPIC_ART: Record<string, string> = {
  "new-players": "/graphics/new-players-1.png",
  "creep-routes": "/graphics/creep-routes-1.png",
  mechanics: "/graphics/game-mechanics-1.png",
};

/** Full-width race showcase used as the masthead background on race pages;
 *  topic pages fall back to the shared PageHeader scene. */
export function learnHeaderArt(c: LearnCategory): string | undefined {
  return c.kind === "race" && c.race
    ? `/factions/headers/${c.race}.jpg`
    : undefined;
}

/** The emblem shown for a Learn category on the homepage and its own page. */
export function learnArt(c: LearnCategory): string | null {
  if (c.kind === "race" && c.race) return `/factions/large/${c.race}.png`;
  return TOPIC_ART[c.id] ?? null;
}
