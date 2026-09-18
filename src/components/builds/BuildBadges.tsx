import { RaceIcon } from "@/components/ui/RaceIcon";
import { cn } from "@/lib/utils";
import type { BuildDifficulty, BuildRace } from "@/lib/builds/types";
import { BUILD_RACES, vsLabel } from "@/lib/builds/types";

const RACE_LABEL = Object.fromEntries(BUILD_RACES.map((r) => [r.id, r.label])) as Record<BuildRace, string>;

/** The opponent side of a matchup: one icon per race, or the random mark
 *  and "Any" when the build is not written for a specific opponent. */
export function VsRaces({
  vsRaces,
  size = 14,
  className,
}: {
  vsRaces: BuildRace[];
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {vsRaces.length ? (
        vsRaces.map((r) => <RaceIcon key={r} race={r} size={size} />)
      ) : (
        <RaceIcon race="random" size={size} />
      )}
      <span className="text-muted">{vsLabel(vsRaces)}</span>
    </span>
  );
}

/** "Race vs Opponent(s)" with faction icons. */
export function Matchup({
  race,
  vsRaces,
  size = 20,
  className,
}: {
  race: BuildRace;
  vsRaces: BuildRace[];
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 text-sm", className)}>
      <RaceIcon race={race} size={size} />
      <span className="font-bold text-fg">{RACE_LABEL[race]}</span>
      <span className="mx-0.5 font-display text-[0.6rem] font-bold uppercase tracking-widest text-gold">vs</span>
      <VsRaces vsRaces={vsRaces} size={size} />
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
