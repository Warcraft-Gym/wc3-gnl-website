import Image from "next/image";
import { cn, RACES, type Race } from "@/lib/utils";

/** Faction icon for a player's race (human, night elf, orc, undead, random). */
export function RaceIcon({
  race,
  size = 18,
  className,
}: {
  race: Race;
  size?: number;
  className?: string;
}) {
  const r = RACES[race];
  return (
    <Image
      src={`/factions/${race}.png`}
      alt={r.label}
      title={r.label}
      width={size}
      height={size}
      className={cn("inline-block shrink-0 object-contain", className)}
    />
  );
}
