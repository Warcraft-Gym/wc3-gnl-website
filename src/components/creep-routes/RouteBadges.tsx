import type { RouteLevel } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { wedgePath } from "@/lib/creep-routes/kills.mjs";

/** The three camp difficulty bands, mirroring `scripts/creep-maps/camps.mjs`'s
 *  `BAND_MAX_LEVEL` (easy <= 9, medium <= 19, hard above — Liquipedia's own
 *  cutoffs). Reused by the map marks, the step table's Camp column and the
 *  camp card's title. */
export const BAND_LABEL: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
export const BAND_TOKEN: Record<string, string> = {
  easy: "var(--wg-camp-easy)",
  medium: "var(--wg-camp-medium)",
  hard: "var(--wg-camp-hard)",
};

/** A small filled dot in the camp's band colour; band is a mark, never text,
 *  same rule as a race colour. With `killed` below 1 it draws the map's
 *  partly cleared mark: a wedge of that share over the colour at 30%. */
export function BandDot({ band, killed, className }: { band?: string | null; killed?: number; className?: string }) {
  if (!band) return null;
  const colour = BAND_TOKEN[band] ?? "var(--wg-text-faint)";
  if (killed !== undefined && killed < 1) {
    return (
      <svg aria-hidden viewBox="0 0 10 10" className={cn("inline-block size-2 shrink-0", className)}>
        <title>{`${BAND_LABEL[band] ?? band}, partly cleared`}</title>
        <circle cx="5" cy="5" r="5" fill={colour} fillOpacity="0.3" />
        <path d={wedgePath(5, 5, 5, killed)} fill={colour} />
      </svg>
    );
  }
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
