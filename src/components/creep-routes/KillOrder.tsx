import type { DerivedKill } from "@/lib/creep-routes/derive";
import type { MapCampCreep } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { CampIcon } from "./CampIcon";

/** Chain icon: 36px on a phone, 40px from `sm` up. */
const CHAIN_ICON = "size-9 sm:size-10";
/** Opaque gold tint shared by the step badge and the level tag. */
const TAG = "tnum absolute grid place-items-center border border-gold/60 bg-[color-mix(in_oklab,var(--wg-gold)_15%,var(--wg-bg))] font-bold leading-none text-gold";
const CAPTION = "mt-1.5 block text-center text-[0.7rem] leading-none";

/**
 * A stop's kills as a chain: one icon per kill with the XP it paid under it,
 * then one ghosted "skip" icon per creep not killed. Step badges show only
 * when the order is authored (`ordered`); the kill that levels the hero up
 * wears a gold ring and a "Lv N" tag. With `onRemove` each kill is a button
 * and with `onAdd` each ghost is a "kill next" button (the builder).
 */
export function KillOrder({
  kills,
  ordered,
  skipped = [],
  onRemove,
  onAdd,
}: {
  kills: DerivedKill[];
  ordered: boolean;
  /** One entry per creep not killed, drawn ghosted after the kills. */
  skipped?: { creep: MapCampCreep; row: number }[];
  onRemove?: (index: number) => void;
  onAdd?: (row: number) => void;
}) {
  if (!kills.length && !skipped.length) return null;
  const focus = "rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold";
  return (
    // Top and left padding keep the step badges, which overhang the icons, inside the box.
    <ol aria-label={ordered ? "Kill order" : "Kills"} className="flex flex-wrap items-start gap-1.5 pl-1 pt-1.5 sm:gap-2">
      {kills.map((k, i) => {
        const step = ordered ? i + 1 : null;
        const body = (
          <>
            <span className="relative block">
              <CampIcon
                iconKey={k.creep.icon}
                title={k.creep.name}
                kind="creep"
                size={40}
                className={cn(CHAIN_ICON, k.leveledUp && "border-2 border-gold")}
              />
              {step ? <span aria-hidden className={cn(TAG, "-left-1 -top-1.5 size-5 rounded-sm text-[0.7rem]")}>{step}</span> : null}
              {k.leveledUp ? (
                <span aria-hidden className={cn(TAG, "-bottom-1 -right-1.5 h-3.5 rounded-sm px-0.5 text-[0.65rem]")}>
                  Lv {k.levelAfter}
                </span>
              ) : null}
            </span>
            <span aria-hidden className={cn(CAPTION, "tnum text-muted")}>+{k.xp}</span>
            {k.leveledUp ? <span className="sr-only">Level {k.levelAfter} reached</span> : null}
          </>
        );
        return (
          <li key={`k${i}`}>
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove step ${i + 1}, ${k.creep.name}`}
                className={cn("block hover:opacity-70", focus)}
              >
                {body}
              </button>
            ) : (
              <>
                {body}
                <span className="sr-only">
                  {step ? `${step}. ` : ""}
                  {k.creep.name}, +{k.xp} xp
                </span>
              </>
            )}
          </li>
        );
      })}
      {skipped.map(({ creep, row }, i) => {
        const body = (
          <>
            <CampIcon
              iconKey={creep.icon}
              title={onAdd ? creep.name : "Left alive"}
              kind="creep"
              size={40}
              className={cn(
                CHAIN_ICON,
                "border-dashed border-line opacity-40 grayscale group-hover:opacity-100 group-focus-visible:opacity-100",
              )}
            />
            <span aria-hidden className={cn(CAPTION, "text-faint")}>skip</span>
          </>
        );
        return (
          <li key={`s${i}`}>
            {onAdd ? (
              <button
                type="button"
                onClick={() => onAdd(row)}
                aria-label={`Kill ${creep.name} next`}
                className={cn("group block", focus)}
              >
                {body}
              </button>
            ) : (
              <span className="block">
                {body}
                <span className="sr-only">{creep.name}, left alive</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
