import type { DerivedKill } from "@/lib/creep-routes/derive";
import { creepDropKind, dropKind } from "@/lib/creep-routes/camp-label.mjs";
import type { MapCamp, MapCampCreep } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { CampIcon } from "./CampIcon";
import { DropPortrait } from "./CreepDropPopover";
import { DropDiamond } from "./DropDiamond";

/** Chain icon: 36px on a phone, 40px from `sm` up. */
const CHAIN_ICON = "size-9 sm:size-10";
/** Opaque gold tint shared by the step badge and the level tag. */
const TAG = "absolute grid place-items-center border border-gold/60 bg-[color-mix(in_oklab,var(--wg-gold)_15%,var(--wg-bg))] font-bold leading-none text-gold";
const CAPTION = "mt-1.5 block text-center text-[0.7rem] leading-none";
const FRAME = { item: "border-2 border-arcane", powerup: "border-2 border-loss" } as const;

/** 2px frame in the creep's drop kind, or nothing without drops. */
function frame(creep: MapCampCreep) {
  const kind = creepDropKind(creep) as keyof typeof FRAME | null;
  return kind ? FRAME[kind] : undefined;
}

/** 10px drop diamond at the icon's bottom-right, in the creep's drop kind. */
function CornerDiamond({ creep }: { creep: MapCampCreep }) {
  const kind = creepDropKind(creep);
  const drop = kind ? creep.drops?.find((d) => dropKind(d) === kind) : undefined;
  return drop ? <DropDiamond drop={drop} className="absolute bottom-[-3px] right-[-3px] size-[10px] ring-1 ring-bg" /> : null;
}

/**
 * A stop's kills as a chain: one icon per kill with the XP it paid under it,
 * then one ghosted "skip" icon per creep left alive. Only kills in the
 * authored prefix (`ordered`) carry a step badge; the kill that levels the
 * hero up wears a gold ring and a "Lv N" tag. A creep carrying a drop set
 * wears a 2px frame in its drop kind (blue item, red Power Up), or a corner
 * diamond when the gold ring or a skip ghost's dashed border takes the
 * frame; its portrait opens `CreepDropPopover`. In the builder `onRemove`
 * makes each ordered kill a remove button and `onAdd` makes each unordered
 * kill and each ghost a "kill next" button.
 */
export function KillOrder({
  camp,
  kills,
  skipped = [],
  onRemove,
  onAdd,
}: {
  camp: MapCamp;
  kills: DerivedKill[];
  /** One entry per creep not killed, drawn ghosted after the kills. */
  skipped?: { creep: MapCampCreep; row: number }[];
  onRemove?: (index: number) => void;
  onAdd?: (row: number) => void;
}) {
  if (!kills.length && !skipped.length) return null;
  const focus = "rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold";
  return (
    // Top and left padding keep the step badges, which overhang the icons, inside the box.
    <ol aria-label={kills.some((k) => k.ordered) ? "Kill order" : "Kills"} className="flex flex-wrap items-start gap-1.5 pl-1 pt-1.5 sm:gap-2">
      {kills.map((k, i) => {
        const step = k.ordered ? i + 1 : null;
        const body = (
          <>
            <DropPortrait creep={k.creep} camp={camp} clickable={!onRemove && !onAdd}>
              <CampIcon
                iconKey={k.creep.icon}
                title={k.creep.name}
                kind="creep"
                size={40}
                className={cn(CHAIN_ICON, k.leveledUp ? "border-2 border-gold" : frame(k.creep))}
              />
              {step ? <span aria-hidden className={cn(TAG, "tnum -left-1 -top-1.5 size-5 rounded-sm text-[0.7rem]")}>{step}</span> : null}
              {k.leveledUp ? <CornerDiamond creep={k.creep} /> : null}
            </DropPortrait>
            <span aria-hidden className={cn(CAPTION, "tnum text-muted")}>+{k.xp}</span>
            {k.leveledUp ? (
              // Third row, under the caption: only this item grows downward.
              <span aria-hidden className={cn(TAG, "tnum static mt-0.5 h-4 w-9 rounded-sm text-[0.65rem] sm:w-10")}>
                Lv {k.levelAfter}
              </span>
            ) : null}
            {k.leveledUp ? <span className="sr-only">Level {k.levelAfter} reached</span> : null}
          </>
        );
        return (
          <li key={`k${i}`}>
            {onRemove && k.ordered ? (
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove step ${i + 1}, ${k.creep.name}`}
                className={cn("block hover:opacity-70", focus)}
              >
                {body}
              </button>
            ) : onAdd && !k.ordered ? (
              <button
                type="button"
                onClick={() => onAdd(k.row)}
                aria-label={`Kill ${k.creep.name} next`}
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
            <DropPortrait creep={creep} camp={camp} clickable={!onAdd}>
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
              <CornerDiamond creep={creep} />
            </DropPortrait>
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
