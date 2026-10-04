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

/** A diagonal split for a creep carrying both kinds: blue top-left, red bottom-right. */
const BOTH_FILL = "linear-gradient(135deg, var(--wg-arcane) 50%, var(--wg-loss) 50%)";

/** A creep icon in its drop frame: a `width`px border in the drop colour, a
 *  wrapper filled with the blue/red split (icon inset by `width`) for a creep
 *  carrying both kinds, or `plain` without drops. `className` goes on the
 *  outermost element. */
function Portrait({
  creep,
  title,
  size,
  sizeClass,
  width = 2,
  plain,
  className,
}: {
  creep: MapCampCreep;
  title: string;
  size: number;
  sizeClass: string;
  width?: 2 | 1.5;
  plain?: string | false;
  className?: string | false;
}) {
  const kind = creepDropKind(creep) as "item" | "powerup" | "both" | null;
  if (kind === "both") {
    return (
      <span className={cn("block shrink-0 rounded", sizeClass, className)} style={{ background: BOTH_FILL, padding: width }}>
        <CampIcon iconKey={creep.icon} title={title} kind="creep" size={size} className="size-full rounded-[2px] border-0" />
      </span>
    );
  }
  const frame = kind ? cn(FRAME[kind], width === 1.5 && "border-[1.5px]") : plain;
  return <CampIcon iconKey={creep.icon} title={title} kind="creep" size={size} className={cn(sizeClass, frame, className)} />;
}

type Member = { kill: DerivedKill; index: number };

/** Kills grouped into units by `unit`, each member with its index in `kills`. */
function groupUnits(kills: DerivedKill[]) {
  const units: { inSet: boolean; members: Member[] }[] = [];
  kills.forEach((kill, index) => {
    const last = units[units.length - 1];
    if (last && kills[index - 1]?.unit === kill.unit) last.members.push({ kill, index });
    else units.push({ inSet: kill.inSet, members: [{ kill, index }] });
  });
  return units;
}

/** The "Lv N" tag under a kill's (or a group's) caption. */
export function LevelTag({ level, className }: { level: number; className?: string }) {
  return (
    <span aria-hidden className={cn(TAG, "tnum static mt-0.5 h-4 rounded-sm text-[0.65rem]", className)}>
      Lv {level}
    </span>
  );
}

/**
 * A stop's kills as a row of units (`unit`/`inSet` from `deriveRoute`). A
 * unit is one single kill, or a set: listed kills sharing a `set` value, or
 * the kills the author did not list, in camp order; a set sits inside one outline
 * ("Kill in any order"), icons 2px apart. Each unit has a centred "+xp"
 * caption (a set's is its total) and, when the stop has two or more units,
 * a step badge. A single kill that levels the hero wears a gold ring; a
 * set the hero levels inside gets a gold outline instead of the neutral
 * one; either way the "Lv N" tag sits under the caption. Skip ghosts follow.
 * A creep carrying a drop set wears a 2px frame in its drop kind (blue
 * item, red Power Up; dashed on a ghost); its portrait opens
 * `CreepDropPopover`. In the builder `onRemove` makes each listed kill a
 * remove button, `onAdd` makes each remainder icon and ghost a "kill next"
 * button, and small "join" / "split" controls sit under the captions.
 */
export function KillOrder({
  camp,
  kills,
  skipped = [],
  onRemove,
  onAdd,
  onJoin,
  onSplit,
}: {
  camp: MapCamp;
  kills: DerivedKill[];
  /** One entry per creep not killed, drawn ghosted after the kills. */
  skipped?: { creep: MapCampCreep; row: number }[];
  /** Builder: remove the listed kill at this index. */
  onRemove?: (index: number) => void;
  onAdd?: (row: number) => void;
  /** Builder: join the single at this listed index with the unit before it. */
  onJoin?: (index: number) => void;
  /** Builder: split the listed set whose first kill is at this index. */
  onSplit?: (index: number) => void;
}) {
  // At most one pinned drop popover per chain: pinning one unpins the other.
  const [pinned, setPinned] = useState<string | null>(null);
  const pin = (key: string) => ({
    pinned: pinned === key,
    onPinnedChange: (on: boolean) => setPinned((p) => (on ? key : p === key ? null : p)),
  });
  if (!kills.length && !skipped.length) return null;
  const units = groupUnits(kills);
  const badged = units.length >= 2;
  const focus = "rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold";
  const edit = "mt-1 block w-full text-center text-[0.65rem] leading-none text-muted hover:text-gold";
  const badge = (step: number, at: string) => (
    <span aria-hidden className={cn(TAG, "tnum size-5 rounded-sm text-[0.7rem]", at)}>{step}</span>
  );
  return (
    // Top and left padding keep the step badges, which overhang the icons, inside the box.
    <ol aria-label="Kill order" className="flex flex-wrap items-start gap-2 pl-1 pt-1.5 sm:gap-2.5">
      {units.map((u, ui) => {
        const step = ui + 1;
        if (!u.inSet) {
          const { kill: k, index: i } = u.members[0];
          const portrait = (
            <>
              <Portrait
                creep={k.creep}
                title={k.creep.name}
                size={40}
                sizeClass={CHAIN_ICON}
                plain={k.leveledUp && LEVEL_RING}
                className={k.leveledUp && creepDropKind(k.creep) && LEVEL_OUTLINE}
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
            <li key={`u${ui}`}>
              {onRemove ? (
                <>
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
                  {onJoin && ui > 0 ? (
                    <button type="button" onClick={() => onJoin(i)} aria-label={`Join ${k.creep.name} with the previous unit`} className={edit}>
                      join
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <DropPortrait creep={k.creep} camp={camp} clickable={!onAdd} {...pin(`k${ui}`)}>
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
        }
        const setXp = u.members.reduce((sum, m) => sum + m.kill.xp, 0);
        const setLevel = u.members.filter((m) => m.kill.leveledUp).at(-1)?.kill.levelAfter;
        const listed = u.members[0].kill.ordered;
        return (
          // A column as wide as the wider of the set and its caption. The outline takes no
          // layout space, so the set's icons and caption line up with the single kills.
          <li key={`u${ui}`} className="flex w-max max-w-full flex-col">
            <div
              title="Kill in any order"
              className={cn(
                "relative flex flex-wrap justify-start gap-0.5 rounded outline",
                setLevel ? "outline-2 outline-offset-[3px] outline-gold" : "outline-1 outline-offset-[3px] outline-line",
              )}
            >
              {u.members.map(({ kill: k, index: i }, j) => {
                const icon = (
                  <Portrait creep={k.creep} title={k.creep.name} size={40} sizeClass={CHAIN_ICON} />
                );
                // Builder: a listed set member is removed on click, a remainder member is pulled into the order.
                const action = listed ? onRemove && (() => onRemove(i)) : onAdd && (() => onAdd(k.row));
                return action ? (
                  <DropPortrait key={j} creep={k.creep} camp={camp} clickable={false}>
                    <button
                      type="button"
                      onClick={action}
                      aria-label={listed ? `Remove ${k.creep.name} from set ${step}` : `Kill ${k.creep.name} next`}
                      className={cn("block hover:opacity-70", focus)}
                    >
                      {icon}
                    </button>
                  </DropPortrait>
                ) : (
                  <DropPortrait key={j} creep={k.creep} camp={camp} clickable {...pin(`u${ui}-${j}`)}>
                    {icon}
                  </DropPortrait>
                );
              })}
              {/* The badge sits on the outline's corner, 3px + 1px outside the icons. */}
              {badged ? badge(step, "-left-2 -top-2.5") : null}
            </div>
            <span aria-hidden className={cn(CAPTION, "tnum text-muted")}>+{setXp}</span>
            {setLevel ? <LevelTag level={setLevel} className="w-full" /> : null}
            {onSplit && listed ? (
              <button type="button" onClick={() => onSplit(u.members[0].index)} aria-label="Split this set" className={edit}>
                split
              </button>
            ) : null}
            <span className="sr-only">
              {badged ? `${step}. ` : ""}In any order: {u.members.map((m) => m.kill.creep.name).join(", ")}, +{setXp} xp
              {setLevel ? `, level ${setLevel} reached` : ""}
            </span>
          </li>
        );
      })}
      {skipped.map(({ creep, row }, i) => {
        const portrait = (
          <Portrait
            creep={creep}
            title={onAdd ? creep.name : "Skipped"}
            size={40}
            sizeClass={CHAIN_ICON}
            plain="border-line"
            className="border-dashed opacity-40 grayscale group-hover:opacity-100 group-focus-visible:opacity-100"
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
                <span className="sr-only">{creep.name}, skipped</span>
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
  const icon = (k: DerivedKill, key: string) => (
    <Portrait key={key} creep={k.creep} title={k.creep.name} size={24} sizeClass="size-6" width={1.5} />
  );
  return (
    <span aria-hidden className="flex flex-wrap items-center gap-1">
      {groupUnits(kills).map((u, ui) =>
        u.inSet ? (
          <span
            key={ui}
            className={cn(
              "mx-0.5 flex flex-wrap items-center gap-px rounded-sm outline outline-1 outline-offset-1",
              u.members.some((m) => m.kill.leveledUp) ? "outline-gold" : "outline-line",
            )}
          >
            {u.members.map((m, j) => icon(m.kill, `${ui}-${j}`))}
          </span>
        ) : (
          icon(u.members[0].kill, `${ui}`)
        ),
      )}
      {skipped.map(({ creep }, i) => (
        <Portrait
          key={`s${i}`}
          creep={creep}
          title="Skipped"
          size={24}
          sizeClass="size-6"
          width={1.5}
          plain="border-line"
          className="border-dashed opacity-40 grayscale"
        />
      ))}
    </span>
  );
}
