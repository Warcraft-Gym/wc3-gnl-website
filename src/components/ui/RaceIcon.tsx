import Image from "next/image";
import { cn, RACES, type Race } from "@/lib/utils";

/** Faction icon for a player's race. "random" has no artwork → colored diamond. */
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

  if (race === "random") {
    return (
      <span
        className={cn("inline-grid shrink-0 place-items-center", className)}
        style={{ width: size, height: size }}
        title="Random"
        aria-label="Random"
      >
        <span
          className={cn("rotate-45", r.dot)}
          style={{ width: size * 0.58, height: size * 0.58 }}
        />
      </span>
    );
  }

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
