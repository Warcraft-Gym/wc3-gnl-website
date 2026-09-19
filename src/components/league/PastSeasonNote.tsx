import Link from "next/link";
import { History } from "lucide-react";
import type { Season } from "@/lib/api/types";

/** Shown on league pages browsing a season that is not the newest one. */
export function PastSeasonNote({ season, latest, href }: { season: Season; latest: Season; href: string }) {
  if (season.number === latest.number) return null;
  return (
    <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-gold/60 pl-4 text-sm text-muted">
      <History size={15} className="shrink-0 text-gold" />
      <span>
        You are looking at <span className="text-fg">{season.shortName}</span>, a past season.
      </span>
      <Link href={href} className="font-semibold text-gold hover:underline">
        Jump to {latest.shortName}
      </Link>
    </p>
  );
}
