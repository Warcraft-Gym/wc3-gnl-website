import { Fragment } from "react";
import { ChevronsUp } from "lucide-react";
import type { DerivedKill } from "@/lib/creep-routes/derive";
import type { MapCampCreep } from "@/lib/creep-routes/types";
import { cn } from "@/lib/utils";
import { CampIcon } from "./CampIcon";

/** Chain icon: 36px on a phone, 40px from `sm` up. */
const CHAIN_ICON = "size-9 sm:size-10";

/** The square gold step badge; square so "1" never reads as a round map stop badge. */
function StepBadge({ step }: { step: number }) {
  return (
    <span
      aria-hidden
      className="tnum absolute -left-1 -top-1.5 grid size-5 place-items-center rounded-sm border border-gold/60 bg-[color-mix(in_oklab,var(--wg-gold)_15%,var(--wg-bg))] text-[0.7rem] font-bold text-gold"
    >
      {step}
    </span>
  );
}

/** "Lv 2" pill after the kill that levels the hero up, centred on the icons. */
function LevelPill({ level }: { level: number }) {
  return (
    <li className="flex h-9 items-center sm:h-10">
      <span className="sr-only">Level {level} reached</span>
      <span
        aria-hidden
        className="tnum inline-flex h-5 items-center gap-0.5 rounded-full border border-gold/60 bg-gold/15 pl-1 pr-1.5 text-[0.75rem] font-semibold leading-none text-fg"
      >
        <ChevronsUp size={12} className="text-gold" />
        Lv {level}
      </span>
    </li>
  );
}

/**
 * A stop's kills as a chain: one icon per kill with the XP it paid under it,
 * a gold "Lv N" pill after each level-up, then the creeps left alive. Step
 * badges show only when the order is authored (`ordered`). With `onRemove`
 * each kill is a button (the builder); `remaining` + `onAdd` append kills.
 */
export function KillOrder({
  kills,
  ordered,
  leave = [],
  onRemove,
  remaining = [],
  onAdd,
}: {
  kills: DerivedKill[];
  ordered: boolean;
  /** Rows left alive, shown greyed after the chain. */
  leave?: { creep: MapCampCreep; n: number }[];
  onRemove?: (index: number) => void;
  /** Builder only: one entry per creep not yet in the order. */
  remaining?: { creep: MapCampCreep; row: number }[];
  onAdd?: (row: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-3 pl-1 pt-1.5">
      {kills.length ? (
        <ol aria-label={ordered ? "Kill order" : "Kills"} className="flex flex-wrap items-start gap-1.5 sm:gap-2">
          {kills.map((k, i) => {
            const step = ordered ? i + 1 : null;
            const body = (
              <>
                <span className="relative block">
                  <CampIcon iconKey={k.creep.icon} title={k.creep.name} kind="creep" size={40} className={CHAIN_ICON} />
                  {step ? <StepBadge step={step} /> : null}
                </span>
                <span aria-hidden className="tnum mt-1 block text-center text-[0.7rem] leading-none text-muted">
                  +{k.xp}
                </span>
              </>
            );
            return (
              <Fragment key={i}>
                <li>
                  {onRemove ? (
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      aria-label={`Remove step ${i + 1}, ${k.creep.name}`}
                      className="block rounded hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
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
                {k.leveledUp ? <LevelPill level={k.levelAfter} /> : null}
              </Fragment>
            );
          })}
        </ol>
      ) : null}

      {leave.length ? (
        <div className={cn("flex flex-wrap items-start gap-2", kills.length && "border-l border-line pl-3")}>
          <span className="flex h-8 items-center text-[0.75rem] text-muted">leave</span>
          {leave.map(({ creep, n }, i) => (
            <span key={i} className="flex max-w-[6.5rem] flex-col items-center gap-1 text-center">
              <CampIcon iconKey={creep.icon} title={creep.name} kind="creep" size={32} className="opacity-45 grayscale" />
              <span className="text-[0.7rem] leading-tight text-faint">
                {creep.name}
                {n > 1 ? <span className="tnum"> ×{n}</span> : null}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {remaining.length && onAdd ? (
        <div className={cn("flex flex-wrap items-start gap-1.5 sm:gap-2", kills.length && "border-l border-line pl-3")}>
          {remaining.map(({ creep, row }, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onAdd(row)}
              aria-label={`Kill ${creep.name} next`}
              className="rounded opacity-45 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <CampIcon iconKey={creep.icon} title={creep.name} kind="creep" size={40} className={CHAIN_ICON} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
