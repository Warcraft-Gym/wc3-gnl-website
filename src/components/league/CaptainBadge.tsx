import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small gold "Captain" chip shown next to a captain's name. */
export function CaptainBadge({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span
      title="Team captain"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded border border-gold/50 bg-gold/10 font-mono uppercase tracking-[0.14em] text-gold",
        compact ? "px-1 py-px text-[0.55rem]" : "px-1.5 py-0.5 text-[0.6rem]",
        className,
      )}
    >
      <Crown size={compact ? 9 : 11} />
      {compact ? null : "Captain"}
    </span>
  );
}
