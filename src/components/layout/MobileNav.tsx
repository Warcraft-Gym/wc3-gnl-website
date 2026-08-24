"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PRIMARY_NAV, GNL_NAV } from "./nav-items";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center border border-line text-fg hover:border-gold/60"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open ? (
        <div className="fixed inset-x-0 top-[var(--header-h,64px)] z-40 max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-line bg-bg-deep/98 backdrop-blur-lg">
          <nav className="flex flex-col px-5 py-4" aria-label="Mobile">
            {PRIMARY_NAV.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={close}
                  className="border-b border-line/60 py-3.5 font-display text-lg font-bold uppercase text-fg"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "border-b border-line/60 py-3.5 font-display text-lg font-bold uppercase transition-colors",
                    pathname.startsWith(item.href)
                      ? "text-gold"
                      : "text-fg hover:text-gold",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}

            <p className="kicker mt-5 mb-1">GNL 18</p>
            {GNL_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "border-b border-line/40 py-2.5 font-display text-sm font-bold uppercase transition-colors",
                  pathname === item.href
                    ? "text-gold"
                    : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            ))}

            <ButtonLink href="/dashboard" size="lg" className="mt-5" onClick={close}>
              Player Dashboard
            </ButtonLink>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
