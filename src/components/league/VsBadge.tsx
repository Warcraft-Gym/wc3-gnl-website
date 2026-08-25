import { cn } from "@/lib/utils";

/** Skewed "VS" divider used between two teams. */
export function VsBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "skew inline-grid h-8 w-12 place-items-center bg-gold/10 text-gold",
        className,
      )}
      aria-hidden
    >
      <span className="font-display text-sm font-extrabold tracking-widest">
        VS
      </span>
    </span>
  );
}

/** Team plate — shows the team logo when available, else the tag. */
export function TeamPlate({
  tag,
  logoUrl,
  name,
  size = "md",
}: {
  tag: string;
  logoUrl?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "size-10 text-[0.65rem]",
    md: "size-14 text-sm",
    lg: "size-20 text-xl",
  } as const;

  if (logoUrl) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden border border-line-strong bg-surface-2/60",
          sizes[size],
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={name ? `${name} logo` : `${tag} logo`}
          loading="lazy"
          className="size-full object-contain p-1"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "skew grid shrink-0 place-items-center border border-line-strong bg-gradient-to-br from-surface-3 to-surface font-display font-extrabold text-gold",
        sizes[size],
      )}
    >
      <span>{tag}</span>
    </span>
  );
}
