import type { DerivedNode } from "@/lib/creep-routes/derive";
import { HeroMeter } from "./HeroMeter";

/** One shared result for paths taken at the same time. Their kill order is unknown. */
export function SplitXpSummary({ node }: { node: DerivedNode }) {
  const leveled = node.levelAfter > node.levelBefore;
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2" aria-label="XP from all paths at the same time">
      <div className="min-w-0">
        <p className="text-[0.75rem] font-medium text-muted">All paths combined</p>
        <p className="tnum text-[0.8rem] text-fg">About +{node.xpGained} XP</p>
      </div>
      <div className={leveled ? "rounded border border-gold bg-gold/5 px-3 py-2" : "px-3 py-2"}>
        {leveled ? <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wide text-gold">Level up</p> : null}
        <HeroMeter level={node.levelAfter} xp={node.xpBefore + node.xpGained} className="block w-32 shrink-0 text-right" />
      </div>
    </div>
  );
}
