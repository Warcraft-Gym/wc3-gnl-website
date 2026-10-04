import type { DerivedNode } from "@/lib/creep-routes/derive";
import { LevelTag } from "./KillOrder";

/** The XP that paths taken at the same time pay together, in a stop's "Lv 2 · 303 xp" style; the level
 *  wears the kill chain's gold tag when the split levels the hero, which marks no path. */
export function SplitXpSummary({ node }: { node: DerivedNode }) {
  const leveled = node.levelAfter > node.levelBefore;
  return (
    <span role="group" aria-label="XP and level after all paths at the same time" className="tnum inline-flex shrink-0 items-center gap-1 pt-0.5 text-[0.8rem] text-muted">
      +{node.xpGained} xp ·{" "}
      {leveled ? (
        <>
          <span className="sr-only">Level up: Lv {node.levelAfter}</span>
          <LevelTag level={node.levelAfter} className="mt-0 px-1 text-[0.75rem]" />
        </>
      ) : (
        <>Lv {node.levelAfter}</>
      )}
    </span>
  );
}
