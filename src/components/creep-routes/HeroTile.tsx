import { Crown } from "lucide-react";
import { GameIcon } from "@/components/builds/GameIcon";
import { cn } from "@/lib/utils";

/** The hero's Bring entry: the route's hero portrait (its name as the title), or, when the route
 *  names no hero, the same frame with a gold crown, "Any Hero". Shared by the stop list and the builder. */
export function HeroTile({ heroIcon, size = 28, className }: { heroIcon?: string; size?: number; className?: string }) {
  if (heroIcon) return <GameIcon iconKey={heroIcon} size={size} className={className} />;
  return (
    <span
      role="img"
      aria-label="Any Hero"
      title="Any Hero"
      style={{ width: size, height: size }}
      className={cn("grid shrink-0 place-items-center rounded border border-line-strong bg-surface-2 text-gold", className)}
    >
      <Crown aria-hidden size={Math.round(size * 0.55)} />
    </span>
  );
}
