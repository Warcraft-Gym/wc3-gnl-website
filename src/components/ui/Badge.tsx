import { cn, RACES, type Race } from "@/lib/utils";
import { RaceIcon } from "./RaceIcon";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "gold" | "arcane" | "live";
}) {
  const tones = {
    neutral: "border-line text-muted",
    gold: "border-gold/50 text-gold",
    arcane: "border-arcane/50 text-arcane",
    live: "border-live/60 text-live",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-0.5 font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RaceBadge({
  race,
  showLabel = true,
  iconSize = 22,
  className,
}: {
  race: Race;
  showLabel?: boolean;
  iconSize?: number;
  className?: string;
}) {
  const r = RACES[race];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
        r.color,
        className,
      )}
    >
      <RaceIcon race={race} size={iconSize} />
      {showLabel ? r.label : null}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 border border-live/60 bg-live/10 px-2.5 py-0.5 font-mono text-[0.66rem] font-bold uppercase tracking-[0.18em] text-live">
      <span className="live-dot size-1.5 rounded-full bg-live" aria-hidden />
      Live
    </span>
  );
}
