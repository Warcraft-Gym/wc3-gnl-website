"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GNL_NAV } from "./nav-items";
import { cn } from "@/lib/utils";

/** GNL section nav. A second floating bar stacked directly under the site
 *  header, sharing its inset, max width and surface so the two read as one
 *  piece of chrome. Its footprint (gap + bar) is --wg-subnav-h. */
export function GnlSubNav({ seasonShortName }: { seasonShortName: string }) {
  const pathname = usePathname();
  return (
    <div className="sticky top-[var(--wg-header-h)] z-40 h-[var(--wg-subnav-h)] px-3 pt-1.5 sm:px-4">
      <div className="mx-auto flex h-12 max-w-[84rem] items-center gap-4 rounded-lg border border-line bg-surface/80 px-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl sm:px-4">
        <span className="btn-gold hidden shrink-0 rounded px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.12em] sm:inline-block">
          <span>{seasonShortName}</span>
        </span>
        <nav
          aria-label="GNL section"
          className="flex h-full flex-1 items-center gap-1 overflow-x-auto max-sm:[mask-image:linear-gradient(90deg,black_calc(100%-2.5rem),transparent)] max-sm:[scrollbar-width:none]"
        >
          {GNL_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
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
