import { useState } from "react";
import type { DerivedKill } from "@/lib/creep-routes/derive";
import { creepDropKind } from "@/lib/creep-routes/camp-label.mjs";
import type { MapCamp, MapCampCreep } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { CampIcon } from "./CampIcon";
import { DropPortrait } from "./CreepDropPopover";

/** Chain icon: 36px on a phone, 40px from `sm` up. */
const CHAIN_ICON = "size-9 sm:size-10";
/** Opaque gold tint shared by the step badge and the level tag. */
const TAG = "absolute grid place-items-center border border-gold/60 bg-[color-mix(in_oklab,var(--wg-gold)_15%,var(--wg-bg))] font-bold leading-none text-gold";
const CAPTION = "mt-1.5 block text-center text-[0.7rem] leading-none";
const FRAME = { item: "border-2 border-arcane", powerup: "border-2 border-loss" } as const;
/** The level-up gold ring: a border alone, or an outline outside a drop frame. */
const LEVEL_RING = "border-2 border-gold";
const LEVEL_OUTLINE = "outline outline-2 outline-offset-2 outline-gold";

/** 2px frame in the creep's drop kind, or nothing without drops. */
function frame(creep: MapCampCreep) {
  const kind = creepDropKind(creep) as keyof typeof FRAME | null;
  return kind ? FRAME[kind] : undefined;
}

/** The "Lv N" tag under a kill's (or a group's) caption. */
function LevelTag({ level, className }: { level: number; className?: string }) {
  return (
    <span aria-hidden className={cn(TAG, "tnum static mt-0.5 h-4 rounded-sm text-[0.65rem]", className)}>
      Lv {level}
    </span>
  );
}

/**
 * A stop's kills as a row of units. A unit is one ordered kill, or a set:
 * the kills the author did not order, in camp order, inside one outline
 * ("Kill in any order"), icons 2px apart. Each unit has a centred "+xp"
 * caption (a set's is its total) and, when the stop has two or more units,
 * a step badge. A single kill that levels the hero wears a gold ring; a
 * set the hero levels inside gets a gold outline instead of the neutral
 * one; either way the "Lv N" tag sits under the caption. Skip ghosts follow.
 * A creep carrying a drop set wears a 2px frame in its drop kind (blue
 * item, red Power Up; dashed on a ghost); its portrait opens
 * `CreepDropPopover`. In the builder `onRemove` makes each single kill a
 * remove button (back into the set) and `onAdd` makes each set icon and
 * each ghost a "kill next" button.
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
  // At most one pinned drop popover per chain: pinning one unpins the other.
  const [pinned, setPinned] = useState<string | null>(null);
  const pin = (key: string) => ({
    pinned: pinned === key,
    onPinnedChange: (on: boolean) => setPinned((p) => (on ? key : p === key ? null : p)),
  });
  if (!kills.length && !skipped.length) return null;
  const singles = kills.filter((k) => k.ordered);
  const set = kills.filter((k) => !k.ordered);
  const setXp = set.reduce((sum, k) => sum + k.xp, 0);
  const setLevel = set.filter((k) => k.leveledUp).at(-1)?.levelAfter;
  const badged = singles.length + (set.length ? 1 : 0) >= 2;
  const focus = "rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold";
  const badge = (step: number, at: string) => (
    <span aria-hidden className={cn(TAG, "tnum size-5 rounded-sm text-[0.7rem]", at)}>{step}</span>
  );
  return (
    // Top and left padding keep the step badges, which overhang the icons, inside the box.
    <ol aria-label="Kill order" className="flex flex-wrap items-start gap-2 pl-1 pt-1.5 sm:gap-2.5">
      {singles.map((k, i) => {
        const step = i + 1;
        const portrait = (
          <>
            <CampIcon
              iconKey={k.creep.icon}
              title={k.creep.name}
              kind="creep"
              size={40}
              className={cn(CHAIN_ICON, frame(k.creep) ?? (k.leveledUp && LEVEL_RING), k.leveledUp && frame(k.creep) && LEVEL_OUTLINE)}
            />
            {badged ? badge(step, "-left-1 -top-1.5") : null}
          </>
        );
        const caption = (
          <>
            <span aria-hidden className={cn(CAPTION, "tnum text-muted")}>+{k.xp}</span>
            {k.leveledUp ? <LevelTag level={k.levelAfter} className="w-9 sm:w-10" /> : null}
          </>
        );
        // The popover stays outside the builder's buttons: no button fade, no dialog inside a button.
        return (
          <li key={`k${i}`}>
            {onRemove ? (
              <DropPortrait creep={k.creep} camp={camp} clickable={false}>
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove step ${step}, ${k.creep.name}`}
                  className={cn("block hover:opacity-70", focus)}
                >
                  {portrait}
                  {caption}
                </button>
              </DropPortrait>
            ) : (
              <>
                <DropPortrait creep={k.creep} camp={camp} clickable={!onAdd} {...pin(`k${i}`)}>
                  {portrait}
                </DropPortrait>
                {caption}
                <span className="sr-only">
                  {badged ? `${step}. ` : ""}
                  {k.creep.name}, +{k.xp} xp{k.leveledUp ? `, level ${k.levelAfter} reached` : ""}
                </span>
              </>
            )}
          </li>
        );
      })}
      {set.length ? (
        // A column as wide as the wider of the set and its caption. The outline takes no
        // layout space, so the set's icons and caption line up with the single kills.
        <li className="flex w-max max-w-full flex-col">
          <div
            title="Kill in any order"
            className={cn(
              "relative flex flex-wrap justify-start gap-0.5 rounded outline",
              setLevel ? "outline-2 outline-offset-[3px] outline-gold" : "outline-1 outline-offset-[3px] outline-line",
            )}
          >
            {set.map((k, j) => {
              const icon = (
                <CampIcon iconKey={k.creep.icon} title={k.creep.name} kind="creep" size={40} className={cn(CHAIN_ICON, frame(k.creep))} />
              );
              return onAdd ? (
                <DropPortrait key={`u${j}`} creep={k.creep} camp={camp} clickable={false}>
                  <button
                    type="button"
                    onClick={() => onAdd(k.row)}
                    aria-label={`Kill ${k.creep.name} next`}
                    className={cn("block hover:opacity-70", focus)}
                  >
                    {icon}
                  </button>
                </DropPortrait>
              ) : (
                <DropPortrait key={`u${j}`} creep={k.creep} camp={camp} clickable {...pin(`u${j}`)}>
                  {icon}
                </DropPortrait>
              );
            })}
            {/* The badge sits on the outline's corner, 3px + 1px outside the icons. */}
            {badged ? badge(singles.length + 1, "-left-2 -top-2.5") : null}
          </div>
          <span aria-hidden className={cn(CAPTION, "tnum text-muted")}>+{setXp}</span>
          {setLevel ? <LevelTag level={setLevel} className="w-full" /> : null}
          <span className="sr-only">
            {badged ? `${singles.length + 1}. ` : ""}In any order: {set.map((k) => k.creep.name).join(", ")}, +{setXp} xp
            {setLevel ? `, level ${setLevel} reached` : ""}
          </span>
        </li>
      ) : null}
      {skipped.map(({ creep, row }, i) => {
        const portrait = (
          <CampIcon
            iconKey={creep.icon}
            title={onAdd ? creep.name : "Left alive"}
            kind="creep"
            size={40}
            className={cn(
              CHAIN_ICON,
              frame(creep) ?? "border-line",
              "border-dashed opacity-40 grayscale group-hover:opacity-100 group-focus-visible:opacity-100",
            )}
          />
        );
        const caption = <span aria-hidden className={cn(CAPTION, "text-faint")}>skip</span>;
        return (
          <li key={`s${i}`}>
            {onAdd ? (
              <DropPortrait creep={creep} camp={camp} clickable={false}>
                <button
                  type="button"
                  onClick={() => onAdd(row)}
                  aria-label={`Kill ${creep.name} next`}
                  className={cn("group block", focus)}
                >
                  {portrait}
                  {caption}
                </button>
              </DropPortrait>
            ) : (
              <span className="block">
                <DropPortrait creep={creep} camp={camp} clickable {...pin(`s${i}`)}>
                  {portrait}
                </DropPortrait>
                {caption}
                <span className="sr-only">{creep.name}, left alive</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The collapsed stop's strip: the same units at 24px, singles 4px apart,
 *  a set's icons 1px apart inside a 1px outline (gold if the hero levels
 *  inside it), drop frames at 1.5px, then dashed ghosts; no badges,
 *  captions or tags. */
export function KillStrip({ kills, skipped = [] }: { kills: DerivedKill[]; skipped?: { creep: MapCampCreep }[] }) {
  const set = kills.filter((k) => !k.ordered);
  const thin = (creep: MapCampCreep) => (frame(creep) ? cn(frame(creep), "border-[1.5px]") : undefined);
  return (
    <span aria-hidden className="flex flex-wrap items-center gap-1">
      {kills.filter((k) => k.ordered).map((k, i) => (
        <CampIcon key={`k${i}`} iconKey={k.creep.icon} title={k.creep.name} kind="creep" size={24} className={cn("size-6", thin(k.creep))} />
      ))}
      {set.length ? (
        <span
          className={cn(
            "mx-0.5 flex flex-wrap items-center gap-px rounded-sm outline outline-1 outline-offset-1",
            set.some((k) => k.leveledUp) ? "outline-gold" : "outline-line",
          )}
        >
          {set.map((k, i) => (
            <CampIcon key={`u${i}`} iconKey={k.creep.icon} title={k.creep.name} kind="creep" size={24} className={cn("size-6", thin(k.creep))} />
          ))}
        </span>
      ) : null}
      {skipped.map(({ creep }, i) => (
        <CampIcon
          key={`s${i}`}
          iconKey={creep.icon}
          title="Left alive"
          kind="creep"
          size={24}
          className={cn("size-6 border-dashed opacity-40 grayscale", thin(creep) ?? "border-line")}
        />
      ))}
    </span>
  );
}
