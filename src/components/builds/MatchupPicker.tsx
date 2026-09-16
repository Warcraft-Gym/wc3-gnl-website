"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { BUILD_RACES, type BuildRace, type BuildVsRace } from "@/lib/builds/types";
import { cn } from "@/lib/utils";

function RaceButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "grid size-11 place-items-center rounded-full border transition-[border-color,box-shadow,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5",
        active
          ? "border-gold bg-gold/10 shadow-[0_0_20px_-4px_var(--wg-gold-glow)]"
          : "border-line bg-surface/60 opacity-70 hover:opacity-100",
      )}
    >
      {children}
    </button>
  );
}

/** Race-vs-race picker, like the reference site. State lives in the URL
 *  (?race=&vs=) so filtered views are shareable. */
export function MatchupPicker({
  race,
  vsRace,
}: {
  race?: BuildRace;
  vsRace?: BuildVsRace;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: "race" | "vs", value: string | undefined) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex items-center gap-1.5">
        <RaceButton active={!race} onClick={() => set("race", undefined)} label="Any race">
          <RaceIcon race="random" size={24} />
        </RaceButton>
        {BUILD_RACES.map((r) => (
          <RaceButton key={r.id} active={race === r.id} onClick={() => set("race", race === r.id ? undefined : r.id)} label={r.label}>
            <RaceIcon race={r.id} size={24} />
          </RaceButton>
        ))}
      </div>
      <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.2em] text-gold">vs</span>
      <div className="flex items-center gap-1.5">
        <RaceButton active={!vsRace} onClick={() => set("vs", undefined)} label="Any opponent">
          <RaceIcon race="random" size={24} />
        </RaceButton>
        {BUILD_RACES.map((r) => (
          <RaceButton key={r.id} active={vsRace === r.id} onClick={() => set("vs", vsRace === r.id ? undefined : r.id)} label={`vs ${r.label}`}>
            <RaceIcon race={r.id} size={24} />
          </RaceButton>
        ))}
      </div>
    </div>
  );
}
