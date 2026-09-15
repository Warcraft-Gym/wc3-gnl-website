"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GNL_NAV } from "./nav-items";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

export function GnlSubNav({ seasonShortName }: { seasonShortName: string }) {
  const pathname = usePathname();
  return (
    <div className="sticky top-[var(--wg-header-h)] z-40 h-[var(--wg-subnav-h)] border-b border-line/70 bg-bg/55 backdrop-blur-lg">
      <Container className="flex h-full items-center gap-4">
        <span className="btn-gold hidden shrink-0 rounded px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.12em] sm:inline-block">
          <span>{seasonShortName}</span>
        </span>
        <nav
          aria-label="GNL section"
          className="flex h-full flex-1 items-center gap-1 overflow-x-auto"
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
                  "flex h-[var(--wg-subnav-h)] items-center whitespace-nowrap border-b-2 px-3 text-sm font-bold transition-colors",
                  active
                    ? "border-gold text-fg"
                    : "border-transparent text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </Container>
    </div>
  );
}
