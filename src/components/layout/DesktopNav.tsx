"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "./nav-items";
import { cn } from "@/lib/utils";

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav
      className="hidden items-center gap-0.5 md:flex"
      aria-label="Main navigation"
    >
      {PRIMARY_NAV.map((item) => {
        const active =
          !item.external &&
          (pathname === item.href ||
            pathname.startsWith(item.href) ||
            (item.label === "League" && pathname.startsWith("/gnl")));

        // Plain sans links like the official nav; the active one carries a
        // small gold underline.
        const cls = cn(
          "relative rounded px-3 py-2 text-[0.95rem] font-bold transition-colors",
          "after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gold after:opacity-0 after:transition-opacity after:duration-[var(--wg-dur)]",
          active ? "text-fg after:opacity-100" : "text-muted hover:text-fg",
        );

        if (item.external) {
          return (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={cls}>
              {item.label}
            </a>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cls}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
