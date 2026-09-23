import type { Race } from "@/lib/utils";

export type BuildRace = Exclude<Race, "random">;
export type BuildVsRace = BuildRace | "any";
export type BuildDifficulty = "beginner" | "intermediate" | "advanced";

export type BuildStep = {
  /** Game clock, "mm:ss"; optional. */
  time?: string;
  /** Food/supply at this step; optional. */
  supply?: number;
  instruction: string;
  /** Key into the icon manifest (src/lib/builds/icons.ts); optional. */
  icon?: string;
};

export type BuildOrder = {
  slug: string;
  title: string;
  race: BuildRace;
  /** Opponent races the build is written for; empty means any opponent. */
  vsRaces: BuildRace[];
  difficulty: BuildDifficulty;
  patch?: string;
  tags: string[];
  summary: string;
  author: string;
  authorDiscord?: string;
  maintainer?: string;
  sourceUrl?: string;
  /** YouTube or Vimeo link, embedded on the build page and flagged in the
   *  list. See `src/lib/video-embed.mjs`. */
  videoUrl?: string;
  /** Slug and title of the Learn guide this build came from, if any. */
  guide?: { slug: string; title: string } | null;
  featured: boolean;
  publishedAt: string;
  updatedAt: string;
  steps: BuildStep[];
  /** Portable Text blocks (from Sanity) or plain paragraphs (fixtures). */
  description?: unknown[] | string[];
};

export const BUILD_RACES: { id: BuildRace; label: string }[] = [
  { id: "human", label: "Human" },
  { id: "orc", label: "Orc" },
  { id: "nightelf", label: "Night Elf" },
  { id: "undead", label: "Undead" },
];

export const BUILD_DIFFICULTIES: { id: BuildDifficulty; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

/** Parse "mm:ss" → seconds; undefined when absent or malformed. */
export function parseClock(time?: string): number | undefined {
  if (!time) return undefined;
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Human-readable opponent list: "Any", "Orc", "Orc / Undead". */
export function vsLabel(vsRaces: BuildRace[]): string {
  if (!vsRaces.length) return "Any";
  return vsRaces.map((r) => BUILD_RACES.find((x) => x.id === r)?.label ?? r).join(" / ");
}
