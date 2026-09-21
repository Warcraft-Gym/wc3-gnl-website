import { Moon } from "lucide-react";
import type { RouteLevel } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";

/** The three camp difficulty bands, mirroring `scripts/creep-maps/camps.mjs`'s
 *  `BAND_MAX_LEVEL` (easy <= 5, medium <= 11, hard above). Reused by the map
 *  marks, the step table's Camp column and `CampDetails`. */
export const BAND_LABEL: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
export const BAND_TOKEN: Record<string, string> = {
  easy: "var(--wg-camp-easy)",
  medium: "var(--wg-camp-medium)",
  hard: "var(--wg-camp-hard)",
};

/** A small filled dot in the camp's band colour; band is a mark, never text,
 *  same rule as a race colour. */
export function BandDot({ band, className }: { band?: string | null; className?: string }) {
  if (!band) return null;
  return (
    <span
      aria-hidden
      title={BAND_LABEL[band] ?? band}
      style={{ background: BAND_TOKEN[band] ?? "var(--wg-text-faint)" }}
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
    />
  );
}

const LEVEL_TONE: Record<RouteLevel, string> = {
  beginner: "border-win/50 text-win",
  standard: "border-gold/50 text-gold",
};

/** "Standard" / "Beginner", the same visual language as `DifficultyBadge`
 *  in build orders. */
export function LevelBadge({ level }: { level: RouteLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em]",
        LEVEL_TONE[level],
      )}
    >
      {level}
    </span>
  );
}

/** Night marker: a moon glyph with a real label, never a `title`-only cue. */
export function NightMark({ className }: { className?: string }) {
  return (
    <span
      title="Night"
      aria-label="Night"
      className={cn("inline-flex items-center text-arcane", className)}
    >
      <Moon size={11} />
    </span>
  );
}
