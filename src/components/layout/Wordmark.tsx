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
        // A fixed height and the attributes' aspect ratio reserve the width before the file arrives,
        // so the header's links never shift right when it loads.
        className={cn(
          "w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,.6)] transition-opacity group-hover:opacity-85",
          compact ? "h-10" : "h-10 sm:h-11",
        )}
      />
    </Link>
  );
}
