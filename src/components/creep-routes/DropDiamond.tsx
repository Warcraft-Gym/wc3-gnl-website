import { dropKind } from "@/lib/creep-routes/camp-label.mjs";
import { cn } from "@/lib/utils";

/** Drop colour by kind: a Power Up set is red, every other set blue. */
export const DROP_TONE = { powerup: "var(--wg-loss)", item: "var(--wg-arcane)" } as const;

/** A drop set's diamond, coloured by `dropKind` (see `camp-label.mjs`). */
export function DropDiamond({
  drop,
  title,
  className,
}: {
  drop: { kind: string; class?: string };
  title?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden={title ? undefined : true}
      title={title}
      style={{ background: DROP_TONE[dropKind(drop) as keyof typeof DROP_TONE] }}
      className={cn("inline-block size-2.5 shrink-0 rotate-45 rounded-[1px]", className)}
    />
  );
}
