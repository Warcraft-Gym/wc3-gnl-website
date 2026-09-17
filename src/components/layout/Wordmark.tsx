import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The gold Warcraft 3 Gym wordmark (transparent background), linking home. */
export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  /** Slightly smaller, for the footer. */
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Warcraft 3 Gym, home"
      className={cn("group inline-flex items-center", className)}
    >
      <Image
        src="/logo/w3gym-gold.webp"
        alt="Warcraft 3 Gym"
        width={640}
        height={299}
        priority={!compact}
        className={cn(
          "h-auto w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,.6)] transition-opacity group-hover:opacity-85",
          compact ? "max-h-10" : "max-h-10 sm:max-h-11",
        )}
      />
    </Link>
  );
}
