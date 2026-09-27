import Link from "next/link";
import type { Season } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Tabs to move between the GNL seasons something took part in. */
export function SeasonSwitcher({
  seasons,
  active,
  href,
}: {
  seasons: Season[];
  active: number;
  href: (seasonNumber: number) => string;
}) {
  return (
    <nav aria-label="Seasons" className="flex flex-wrap gap-2">
      {seasons.map((s) => {
        const isActive = s.number === active;
        return (
          <Link
            key={s.id}
            href={href(s.number)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border px-3 py-1.5 font-display text-sm font-bold uppercase tracking-wide transition-colors",
              isActive
                ? "border-gold/70 bg-gold/10 text-gold"
                : "border-line text-muted hover:border-gold/50 hover:text-gold",
            )}
          >
            {s.shortName}
          </Link>
        );
      })}
    </nav>
  );
}
