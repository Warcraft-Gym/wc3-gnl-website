"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { GNL_NAV } from "./nav-items";
import { parseSeasonParam, withSeason } from "@/lib/api/season-params";
import { cn } from "@/lib/utils";

export type SubNavSeason = { number: number; shortName: string; name: string };

/** GNL section nav. A second floating bar stacked directly under the site
 *  header, sharing its inset, max width and surface so the two read as one
 *  piece of chrome. Its footprint (gap + bar) is --wg-subnav-h. The pill on
 *  the left names the season being browsed and switches between seasons;
 *  the section links keep that season. */
export function GnlSubNav({ seasons }: { seasons: SubNavSeason[] }) {
  return (
    <Suspense fallback={<Bar seasons={seasons} seasonNumber={undefined} />}>
      <SeasonAwareBar seasons={seasons} />
    </Suspense>
  );
}

function SeasonAwareBar({ seasons }: { seasons: SubNavSeason[] }) {
  const requested = parseSeasonParam(useSearchParams().get("season") ?? undefined);
  const known = seasons.some((s) => s.number === requested);
  return <Bar seasons={seasons} seasonNumber={known ? requested : undefined} />;
}

function Bar({ seasons, seasonNumber }: { seasons: SubNavSeason[]; seasonNumber: number | undefined }) {
  const pathname = usePathname();
  const latest = seasons[0];
  const current = seasons.find((s) => s.number === seasonNumber) ?? latest;
  // The newest season is the default, so its links carry no param.
  const param = current && latest && current.number !== latest.number ? current.number : undefined;
  return (
    <div className="sticky top-[var(--wg-header-h)] z-40 h-[var(--wg-subnav-h)] px-3 pt-1.5 sm:px-4">
      <div className="mx-auto flex h-12 max-w-[84rem] items-center gap-4 rounded-lg border border-line bg-surface/80 px-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl sm:px-4">
        {current ? <SeasonMenu seasons={seasons} current={current} pathname={pathname} /> : null}
        <nav
          aria-label="GNL section"
          className="flex h-full flex-1 items-center gap-1 overflow-x-auto max-sm:[mask-image:linear-gradient(90deg,black_calc(100%-2.5rem),transparent)] max-sm:[scrollbar-width:none]"
        >
          {GNL_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={withSeason(item.href, param)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full items-center whitespace-nowrap px-3 text-sm font-bold transition-colors",
                  "after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-gold after:opacity-0 after:transition-opacity after:duration-[var(--wg-dur)]",
                  active ? "text-fg after:opacity-100" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/** The gold season pill; with more than one season it opens a list. */
function SeasonMenu({ seasons, current, pathname }: { seasons: SubNavSeason[]; current: SubNavSeason; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Season-specific pages (a week, a team) may not exist in another season,
  // so switching lands on the section's index.
  const section = GNL_NAV.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.href ?? "/gnl/schedule";
  const latest = seasons[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (seasons.length < 2) {
    return (
      <span className="btn-gold hidden shrink-0 rounded px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.12em] sm:inline-block">
        <span>{current.shortName}</span>
      </span>
    );
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Season: ${current.name}. Change season`}
        className="btn-gold inline-flex items-center gap-1.5 rounded px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.12em]"
      >
        <span>{current.shortName}</span>
        <ChevronDown size={15} className={cn("transition-transform duration-[var(--wg-dur)]", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Seasons"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-44 rounded-lg border border-line bg-surface p-1 shadow-[0_18px_40px_-12px_rgba(0,0,0,.95)]"
        >
          {seasons.map((s) => {
            const active = s.number === current.number;
            return (
              <Link
                key={s.number}
                role="menuitem"
                href={withSeason(section, s.number === latest.number ? undefined : s.number)}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded px-3 py-2 text-sm transition-colors",
                  active ? "text-gold" : "text-muted hover:bg-white/5 hover:text-fg",
                )}
              >
                <span>
                  <span className="block font-display font-bold uppercase tracking-wide">{s.shortName}</span>
                  <span className="block text-xs text-faint">{s.number === latest.number ? "Latest season" : s.name}</span>
                </span>
                {active ? <Check size={16} /> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
