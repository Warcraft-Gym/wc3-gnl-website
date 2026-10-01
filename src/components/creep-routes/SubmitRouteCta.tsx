import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/** The "Got a route worth sharing?" panel: the route list's header call to
 *  action, and the end of the creep routes guide. */
export function SubmitRouteCta({ id, className }: { id?: string; className?: string }) {
  return (
    <div id={id} className={cn("@container panel relative overflow-hidden border-gold/40 p-6 leading-normal sm:p-8", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ backgroundImage: "radial-gradient(28rem 14rem at 100% 120%, var(--wg-gold-glow), transparent 65%)" }}
      />
      {/* Side by side only when the panel itself is wide: the route list, not a guide column. */}
      <div className="relative flex flex-col items-start gap-4 @2xl:flex-row @2xl:items-center @2xl:justify-between">
        <div>
          <p className="kicker">Community routes</p>
          <h2 className="mt-2 text-[1.15rem] font-bold tracking-[0.05em] text-fg">Got a route worth sharing?</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Submit it here, no account needed. A coach reviews it and it goes up with your name on it.
          </p>
        </div>
        <ButtonLink href="/learn/creep-routes/submit" size="lg" className="shrink-0">
          Submit a route
        </ButtonLink>
      </div>
    </div>
  );
}
