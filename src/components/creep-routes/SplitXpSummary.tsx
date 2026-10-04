import type { DerivedNode } from "@/lib/creep-routes/derive";
import { heroXpForLevel } from "@/lib/creep-routes/xp.mjs";

/** One shared result for paths taken at the same time. Their kill order is unknown. */
export function SplitXpSummary({ node }: { node: DerivedNode }) {
  const leveled = node.levelAfter > node.levelBefore;
  const xp = node.xpBefore + node.xpGained;
  const floor = heroXpForLevel(node.levelAfter);
  const next = heroXpForLevel(node.levelAfter + 1);
  const share = Math.min(Math.max((xp - floor) / (next - floor), 0), 1);
  return (
    <div className="flex justify-end" role="group" aria-label="XP and level after all paths at the same time">
      <div className={leveled ? "w-44 rounded border border-gold bg-gold/5 px-2 py-1" : "w-44 rounded border border-line/60 px-2 py-1"}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="tnum text-[0.75rem] text-fg">+{node.xpGained} XP</span>
          {leveled ? <span className="sr-only">Level up: </span> : null}
          <span className="font-display text-base font-bold leading-none text-fg">Lv {node.levelAfter}</span>
        </div>
        <p className="tnum mt-0.5 text-right text-[0.65rem] leading-none text-muted">{xp} / {next} XP</p>
        <div aria-hidden className="mt-1 h-0.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-gold" style={{ width: `${share * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
