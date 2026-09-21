"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { GameIcon } from "./GameIcon";
import { GAME_ICONS, getGameIcon, type IconKind, type IconRace } from "@/lib/builds/icons";
import { cn } from "@/lib/utils";

const TABS: { id: IconRace | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "human", label: "HU" },
  { id: "orc", label: "OR" },
  { id: "nightelf", label: "NE" },
  { id: "undead", label: "UD" },
  { id: "neutral", label: "Neutral" },
];

const RECENT_KEY = "wg:recent-icons";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function pushRecent(key: string) {
  try {
    const next = [key, ...readRecent().filter((k) => k !== key)].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable */
  }
}

/**
 * Icon picker: a button showing the current icon that opens a popover grid
 * of real icons, searchable, tabbed by race, with a recently-used row.
 * `race` pre-selects that race's tab so most picks are one click away.
 */
export function IconPicker({
  value,
  onChange,
  race,
  kind,
}: {
  value: string;
  onChange: (key: string) => void;
  race?: IconRace;
  /** Restricts the grid (and search) to one icon kind, e.g. "hero" for the
   *  creep-route editor's hero field. Unset shows every kind, builds' own
   *  usage. */
  kind?: IconKind;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<IconRace | "all">(race ?? "all");
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  function openPicker() {
    setRecent(readRecent());
    setTab(race ?? "all");
    setQ("");
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => search.current?.focus(), 0);
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const pool = kind ? GAME_ICONS.filter((i) => i.kind === kind) : GAME_ICONS;
    // A search looks across every race; the tab only filters when browsing.
    if (needle) return pool.filter((i) => i.title.toLowerCase().includes(needle));
    return pool.filter((i) => tab === "all" || i.race === tab);
  }, [tab, q, kind]);

  const current = getGameIcon(value);

  function pick(key: string) {
    onChange(key);
    if (key) pushRecent(key);
    setOpen(false);
  }

  return (
    <div ref={root} className={cn("relative", open && "z-40")}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={current ? current.title : "Pick an icon"}
        className={cn(
          "flex h-10 items-center gap-2 rounded border pl-1 pr-2 text-sm transition-colors",
          open ? "border-gold/60" : "border-line hover:border-gold/50",
          "bg-surface/60",
        )}
      >
        {current ? (
          <GameIcon iconKey={value} size={30} />
        ) : (
          <span className="grid size-[30px] place-items-center rounded border border-dashed border-line text-faint">
            <span className="text-[0.55rem] font-bold uppercase tracking-wider">icon</span>
          </span>
        )}
        <ChevronDown size={14} className="text-faint" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose an icon"
          className="absolute left-0 top-full z-40 mt-1 w-[19rem] rounded-lg border border-line bg-bg/95 p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,.9)] backdrop-blur-xl sm:w-[22rem]"
        >
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              ref={search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search icons…"
              className="h-8 w-full rounded border border-line bg-surface/60 pl-7 pr-2 text-xs text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none"
            />
          </div>

          <div className="mt-2 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-7 flex-1 rounded font-display text-[0.6rem] font-bold uppercase tracking-[0.1em] transition-colors",
                  tab === t.id ? "bg-gold/15 text-gold" : "text-muted hover:text-fg",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {recent.length && !q ? (
            <div className="mt-2">
              <p className="mb-1 px-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint">Recent</p>
              <div className="flex flex-wrap gap-1">
                {recent.map((k) => (
                  <button key={k} type="button" onClick={() => pick(k)} title={getGameIcon(k)?.title} className="rounded ring-gold hover:ring-2">
                    <GameIcon iconKey={k} size={30} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-2 grid max-h-56 grid-cols-7 gap-1 overflow-y-auto pr-0.5 sm:grid-cols-8">
            {shown.map((i) => (
              <button
                key={i.key}
                type="button"
                onClick={() => pick(i.key)}
                title={i.title}
                className={cn("rounded ring-gold hover:ring-2", value === i.key && "ring-2")}
              >
                <GameIcon iconKey={i.key} size={34} />
              </button>
            ))}
            {!shown.length ? <p className="col-span-full py-6 text-center text-xs text-faint">No icons match.</p> : null}
          </div>

          {value ? (
            <button
              type="button"
              onClick={() => pick("")}
              className="mt-2 inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-wide text-muted hover:text-loss"
            >
              <X size={11} /> Remove icon
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
