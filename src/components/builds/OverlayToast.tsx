"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DELAY_MS = 4000;

/** Bottom-right toast pointing at the overlay app. Slides in a few seconds
 *  after the build list loads, on every visit; closing it only hides it
 *  until the next page load. */
export function OverlayToast() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const dismiss = () => setOpen(false);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm transition-[transform,opacity] duration-500 ease-[var(--ease-out-expo)]",
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <div className="panel relative flex items-center gap-4 border-arcane/50 bg-bg/95 p-4 pr-10 shadow-[0_24px_60px_-16px_rgba(0,0,0,.95)] backdrop-blur-xl">
        <Image
          src="/overlay/smart-peon.webp"
          alt=""
          width={192}
          height={192}
          className="size-14 shrink-0 rounded-full border border-arcane/40 object-cover shadow-[0_6px_16px_rgba(0,0,0,.7)]"
        />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-fg">
              Take a build into the game
            </span>
            <span className="rounded border border-arcane/50 px-1.5 py-0.5 font-mono text-[0.58rem] tracking-[0.16em] text-arcane">
              Beta
            </span>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            A desktop overlay floats any of these builds over Warcraft III while you play.
          </p>
          <Link
            href="/tools/overlay"
            onClick={dismiss}
            className="mt-2 inline-flex items-center gap-1 font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gold hover:underline"
          >
            Try the overlay <ArrowRight size={15} />
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-2 top-2 grid size-7 place-items-center rounded text-faint transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
