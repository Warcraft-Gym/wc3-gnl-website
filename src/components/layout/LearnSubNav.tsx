"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEARN_NAV } from "./nav-items";
import { cn } from "@/lib/utils";

/** Learn section nav: the same floating bar the GNL pages have, stacked
 *  under the site header, so both halves of the site move the same way.
 *  Its footprint (gap + bar) is --wg-subnav-h. A guide page lights the
 *  race it belongs to when the caller passes it. */
export function LearnSubNav({ activeHref }: { activeHref?: string }) {
  const pathname = usePathname();
  return (
    <div className="sticky top-[var(--wg-header-h)] z-40 h-[var(--wg-subnav-h)] px-3 pt-1.5 sm:px-4">
      {/* No "Learn" chip: it was styled as a gold button but was a plain
          `span` with no link, and the bar's own first item ("Guides") already
          goes to /learn. A reader reported it as "not really a button, idk if
          we even need that there" — both halves correct. */}
      <div className="mx-auto flex h-12 max-w-[84rem] items-center gap-4 rounded-lg border border-line bg-surface/80 px-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl sm:px-4">
        <nav
          aria-label="Learn section"
          className="flex h-full flex-1 items-center gap-1 overflow-x-auto max-sm:[mask-image:linear-gradient(90deg,black_calc(100%-2.5rem),transparent)] max-sm:[scrollbar-width:none]"
        >
          {LEARN_NAV.map((item) => {
            const active =
              item.href === (activeHref ?? "") ||
              (item.href === "/learn" ? pathname === "/learn" : pathname === item.href || pathname.startsWith(item.href + "/"));
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
