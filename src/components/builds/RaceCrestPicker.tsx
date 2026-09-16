"use client";

import Image from "next/image";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { BUILD_RACES, type BuildRace } from "@/lib/builds/types";
import { cn } from "@/lib/utils";

export type CrestOption = BuildRace | "any";

/** One large labelled race crest. "Any" uses the random mark on a plain plate.
 *  Shared by the build list's matchup picker and the submit form. */
export function RaceCrest({
  id,
  label,
  active,
  onClick,
  size = "md",
}: {
  id: CrestOption;
  label: string;
  active: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  const plate = size === "sm" ? "size-12 sm:size-14" : "size-14 sm:size-[4.25rem]";
  const art = size === "sm" ? "size-9 sm:size-11" : "size-11 sm:size-[3.25rem]";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("group flex flex-col items-center gap-1.5", size === "sm" ? "w-14 sm:w-16" : "w-[4.25rem] sm:w-20")}
    >
      <span
        className={cn(
          "relative grid place-items-center rounded-full border-2 transition-[border-color,box-shadow,transform,opacity] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5",
          plate,
          active
            ? "border-gold bg-gold/10 shadow-[0_0_0_4px_rgba(0,0,0,.5),0_0_28px_-4px_var(--wg-gold-glow)]"
            : "border-line-strong/60 bg-surface/70 opacity-80 group-hover:border-gold/50 group-hover:opacity-100",
        )}
      >
        {id === "any" ? (
          <RaceIcon race="random" size={size === "sm" ? 24 : 30} />
        ) : (
          <Image
            src={`/factions/large/${id}.webp`}
            alt=""
            width={64}
            height={64}
            className={cn("object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,.8)]", art)}
          />
        )}
      </span>
      <span
        className={cn(
          "font-display text-[0.6rem] font-bold uppercase leading-none tracking-[0.12em] transition-colors",
          active ? "text-gold" : "text-muted group-hover:text-fg",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export const CREST_OPTIONS: { id: CrestOption; label: string }[] = [
  { id: "any", label: "Any" },
  ...BUILD_RACES,
];

/** A row of crests. `allowAny` adds the "Any" option (opponent side). */
export function RaceCrestRow({
  value,
  onChange,
  allowAny = false,
  size = "md",
}: {
  value: CrestOption | "";
  onChange: (v: CrestOption) => void;
  allowAny?: boolean;
  size?: "sm" | "md";
}) {
  const options = allowAny ? CREST_OPTIONS : CREST_OPTIONS.filter((o) => o.id !== "any");
  return (
    <div className="flex gap-1 sm:gap-2">
      {options.map((o) => (
        <RaceCrest key={o.id} id={o.id} label={o.label} active={value === o.id} onClick={() => onChange(o.id)} size={size} />
      ))}
    </div>
  );
}
