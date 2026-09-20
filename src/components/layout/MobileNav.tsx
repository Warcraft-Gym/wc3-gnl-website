"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PRIMARY_NAV, GNL_NAV } from "./nav-items";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_URL } from "@/lib/links";

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
        className="grid size-10 place-items-center rounded border border-line bg-surface/60 text-fg hover:border-gold/60"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open ? (
        <div className="fixed inset-x-3 top-[calc(var(--wg-header-h)-4px)] z-40 max-h-[calc(100dvh-var(--wg-header-h))] overflow-y-auto rounded-lg border border-line bg-surface/95 shadow-[0_20px_50px_-12px_rgba(0,0,0,.9)] backdrop-blur-xl">
          <nav className="flex flex-col px-5 py-4" aria-label="Mobile">
            {PRIMARY_NAV.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={close}
                  className="flex items-center gap-2 border-b border-line/60 py-3.5 font-display text-base font-bold uppercase tracking-[0.08em] text-fg"
                >
                  {item.label === "Discord" ? (
                    <DiscordIcon size={18} className="text-[#5865F2]" />
                  ) : null}
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "border-b border-line/60 py-3.5 font-display text-base font-bold uppercase tracking-[0.08em] transition-colors",
                    pathname === item.href ||
                      (pathname.startsWith(item.href + "/") &&
                        !(item.href === "/learn" && pathname.startsWith("/learn/builds")))
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
                  "border-b border-line/40 py-2.5 text-sm font-bold transition-colors",
                  pathname === item.href
                    ? "text-gold"
                    : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            ))}

            <ButtonLink href={DISCORD_URL} variant="discord" size="lg" className="mt-5" target="_blank" rel="noreferrer" onClick={close}>
              <DiscordIcon size={18} /> Join Discord
            </ButtonLink>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
