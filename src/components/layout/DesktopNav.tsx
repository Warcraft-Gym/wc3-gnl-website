"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "./nav-items";
import { cn } from "@/lib/utils";

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav
      className="hidden items-center gap-1 md:flex"
      aria-label="Main navigation"
    >
      {PRIMARY_NAV.map((item) => {
        const active =
          !item.external &&
          (pathname === item.href ||
            pathname.startsWith(item.href) ||
            (item.label === "League" && pathname.startsWith("/gnl")));

        const cls = cn(
          "relative px-3 py-2 font-display text-sm font-bold uppercase tracking-wider transition-colors",
          "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-[var(--wg-dur)] after:ease-[var(--ease-out-expo)]",
          active
            ? "text-gold after:scale-x-100"
            : "text-muted hover:text-fg hover:after:scale-x-100",
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
