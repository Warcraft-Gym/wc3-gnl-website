"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GNL_NAV } from "./nav-items";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

export function GnlSubNav({ seasonShortName }: { seasonShortName: string }) {
  const pathname = usePathname();
  return (
    <div className="sticky top-16 z-40 border-b border-line/70 bg-bg-deep/85 backdrop-blur-lg">
      <Container className="flex items-center gap-4">
        <span className="skew hidden shrink-0 bg-gold px-3 py-1 font-display text-sm font-extrabold uppercase tracking-wider text-bg-deep sm:inline-block">
          <span>{seasonShortName}</span>
        </span>
        <nav
          aria-label="GNL section"
          className="-mb-px flex flex-1 items-center gap-1 overflow-x-auto"
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
                  "whitespace-nowrap border-b-2 px-3 py-3 font-display text-sm font-bold uppercase tracking-wide transition-colors",
                  active
                    ? "border-gold text-gold"
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
