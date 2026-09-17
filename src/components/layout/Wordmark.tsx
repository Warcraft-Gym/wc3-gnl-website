import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Warcraft 3 Gym wordmark (white on transparent), linking home. */
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
        src="/logo/w3gym.webp"
        alt="Warcraft 3 Gym"
        width={600}
        height={210}
        priority={!compact}
        className={cn(
          "h-auto w-auto transition-opacity group-hover:opacity-80",
          compact ? "max-h-8" : "max-h-9 sm:max-h-10",
        )}
      />
    </Link>
  );
}
