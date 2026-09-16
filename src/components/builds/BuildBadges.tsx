import { RaceIcon } from "@/components/ui/RaceIcon";
import { cn } from "@/lib/utils";
import type { BuildDifficulty, BuildRace, BuildVsRace } from "@/lib/builds/types";
import { BUILD_RACES } from "@/lib/builds/types";

const RACE_LABEL = Object.fromEntries(BUILD_RACES.map((r) => [r.id, r.label])) as Record<BuildRace, string>;

/** "Race vs Opponent" with faction icons; "Any" uses the random mark. */
export function Matchup({
  race,
  vsRace,
  size = 20,
  className,
}: {
  race: BuildRace;
  vsRace: BuildVsRace;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", className)}>
      <RaceIcon race={race} size={size} />
      <span className="font-bold text-fg">{RACE_LABEL[race]}</span>
      <span className="mx-0.5 font-display text-[0.6rem] font-bold uppercase tracking-widest text-gold">vs</span>
      <RaceIcon race={vsRace === "any" ? "random" : vsRace} size={size} />
      <span className="text-muted">{vsRace === "any" ? "Any" : RACE_LABEL[vsRace]}</span>
    </span>
  );
}

const DIFF_TONE: Record<BuildDifficulty, string> = {
  beginner: "border-win/50 text-win",
  intermediate: "border-arcane/50 text-arcane",
  advanced: "border-gold/50 text-gold",
};

export function DifficultyBadge({ level }: { level: BuildDifficulty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em]",
        DIFF_TONE[level],
      )}
    >
      {level}
    </span>
  );
}

export function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-line bg-surface/60 px-2 py-0.5 text-[0.7rem] text-muted">
      {children}
    </span>
  );
}
