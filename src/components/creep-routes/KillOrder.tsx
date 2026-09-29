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
 * A stop's kills as a chain: the authored prefix (`ordered`) one icon per
 * kill with a step badge and the XP it paid; then the unordered rest as one
 * bracketed group in camp order with a single "+xp · any order" caption, so
 * it never reads as a sequence; then one ghosted "skip" icon per creep left
 * alive. An ordered kill that levels the hero wears a gold ring and a "Lv N"
 * tag; a level-up inside the group puts the tag under the group caption. A creep carrying a drop set
 * wears a 2px frame in its drop kind (blue item, red Power Up; dashed on a
 * skip ghost), with the gold ring as an outline outside it when that kill
 * also levels the hero; its portrait opens `CreepDropPopover`. In the builder `onRemove`
 * makes each ordered kill a remove button and `onAdd` makes each grouped
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
  // At most one pinned drop popover per chain: pinning one unpins the other.
  const [pinned, setPinned] = useState<string | null>(null);
  const pin = (key: string) => ({
    pinned: pinned === key,
    onPinnedChange: (on: boolean) => setPinned((p) => (on ? key : p === key ? null : p)),
  });
  if (!kills.length && !skipped.length) return null;
  const ordered = kills.filter((k) => k.ordered);
  const group = kills.filter((k) => !k.ordered);
  const groupXp = group.reduce((sum, k) => sum + k.xp, 0);
  const groupLevel = group.filter((k) => k.leveledUp).at(-1)?.levelAfter;
  const focus = "rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold";
  return (
    // Top and left padding keep the step badges, which overhang the icons, inside the box.
    <ol aria-label={ordered.length ? "Kill order" : "Kills"} className="flex flex-wrap items-start gap-2 pl-1 pt-1.5 sm:gap-2.5">
      {ordered.map((k, i) => {
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
            <span aria-hidden className={cn(TAG, "tnum -left-1 -top-1.5 size-5 rounded-sm text-[0.7rem]")}>{step}</span>
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
                  {step}. {k.creep.name}, +{k.xp} xp{k.leveledUp ? `, level ${k.levelAfter} reached` : ""}
                </span>
              </>
            )}
          </li>
        );
      })}
      {group.length ? (
        // The unordered kills as one bracketed group: no badges, one total, "any order".
        // A column as wide as the wider of the icon row and the caption. The bracket is an
        // outline (offset 3px), so it takes no layout space and icons and captions line up.
        <li className="flex w-max max-w-full flex-col">
          <div className="flex flex-wrap justify-start gap-2 rounded outline outline-1 outline-offset-[3px] outline-line sm:gap-2.5">
            {group.map((k, j) => {
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
          </div>
          <span aria-hidden className={cn(CAPTION, "tnum whitespace-nowrap text-muted")}>+{groupXp} · any order</span>
          {groupLevel ? <LevelTag level={groupLevel} className="w-full" /> : null}
          <span className="sr-only">
            In any order: {group.map((k) => k.creep.name).join(", ")}, +{groupXp} xp
            {groupLevel ? `, level ${groupLevel} reached` : ""}
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

/** The collapsed stop's strip: 24px portraits, ordered kills first, the
 *  unordered rest in the same bracket as the chain, then dashed ghosts for
 *  creeps left alive; drop frames kept, no badges, captions or tags. */
export function KillStrip({ kills, skipped = [] }: { kills: DerivedKill[]; skipped?: { creep: MapCampCreep }[] }) {
  return (
    <span aria-hidden className="flex flex-wrap items-center gap-1">
      {kills.filter((k) => k.ordered).map((k, i) => (
        <CampIcon key={`k${i}`} iconKey={k.creep.icon} title={k.creep.name} kind="creep" size={24} className={cn("size-6", frame(k.creep))} />
      ))}
      {kills.some((k) => !k.ordered) ? (
        <span className="flex flex-wrap items-center gap-1 rounded border border-line p-1">
          {kills.filter((k) => !k.ordered).map((k, i) => (
            <CampIcon key={`u${i}`} iconKey={k.creep.icon} title={k.creep.name} kind="creep" size={24} className={cn("size-6", frame(k.creep))} />
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
          className={cn("size-6 border-dashed opacity-40 grayscale", frame(creep) ?? "border-line")}
        />
      ))}
    </span>
  );
}
