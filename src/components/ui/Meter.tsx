import { cn } from "@/lib/utils";

/**
 * One bar in one hue on a neutral track. The caller puts the figure beside it,
 * so the figure stays readable text; this mark carries only the shape.
 */
export function Meter({
  value,
  max,
  label,
  hue = "bg-win",
  className,
}: {
  value: number;
  max: number;
  /** What the bar shows and its amount, for a reader who cannot see it. */
  label: string;
  /** A background utility class, one hue. */
  hue?: string;
  className?: string;
}) {
  const share = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("block h-1.5 overflow-hidden rounded bg-surface-3", className)}
    >
      <span className={cn("block h-full rounded", hue)} style={{ width: `${share}%` }} />
    </span>
  );
}
