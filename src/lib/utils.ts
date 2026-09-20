import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Race → label, short code and the fill token of a race mark. A race name in
 *  text wears a text token, so there is no text colour here. */
export const RACES = {
  human: { label: "Human", dot: "bg-human", short: "HU" },
  orc: { label: "Orc", dot: "bg-orc", short: "OR" },
  nightelf: { label: "Night Elf", dot: "bg-nightelf", short: "NE" },
  undead: { label: "Undead", dot: "bg-undead", short: "UD" },
  random: { label: "Random", dot: "bg-random", short: "RD" },
} as const;

export type Race = keyof typeof RACES;

export function raceOf(input?: string | null): Race {
  const k = (input ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (k.startsWith("hu")) return "human";
  // "OC" is W3Champions' code for Orc.
  if (k.startsWith("or") || k === "oc") return "orc";
  if (k.startsWith("ni") || k === "elf" || k === "ne") return "nightelf";
  if (k.startsWith("un") || k === "ud") return "undead";
  return "random";
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatMatchTime(iso?: string | null): string {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return DATE_FMT.format(d);
}

export function isLive(iso?: string | null, durationMin = 90): boolean {
  if (!iso) return false;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return false;
  const now = Date.now();
  return now >= start && now <= start + durationMin * 60_000;
}
