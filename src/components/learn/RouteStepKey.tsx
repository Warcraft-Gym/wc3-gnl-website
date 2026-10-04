/** A small map key for the three choices in the route builder. */
export function RouteStepKey() {
  return (
    <figure className="my-6 grid gap-2 sm:grid-cols-3" aria-label="How places appear on a route map">
      <div className="rounded border border-line bg-bg p-3">
        <svg aria-hidden viewBox="0 0 140 38" className="h-10 w-full">
          <path d="M8 19 H132" stroke="var(--wg-text-muted)" strokeWidth="2" />
          <circle cx="70" cy="19" r="6" fill="var(--wg-bg)" stroke="white" strokeWidth="1.5" />
        </svg>
        <p className="font-semibold text-fg">On the route</p>
        <p className="text-sm text-muted">The line goes through the place.</p>
      </div>
      <div className="rounded border border-line bg-bg p-3">
        <svg aria-hidden viewBox="0 0 140 38" className="h-10 w-full">
          <path d="M8 19 H132" stroke="var(--wg-text-muted)" strokeWidth="2" />
          <path d="M70 18 V8" stroke="var(--wg-text-muted)" strokeWidth="1.5" strokeDasharray="3 2" />
          <path d="M70 2 L76 8 L70 14 L64 8 Z" fill="var(--wg-bg)" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
        <p className="font-semibold text-fg">A pin</p>
        <p className="text-sm text-muted">The place is marked. The line skips it.</p>
      </div>
      <div className="rounded border border-line bg-bg p-3">
        <div aria-hidden className="flex h-10 items-center justify-center text-muted">TP home</div>
        <p className="font-semibold text-fg">No place</p>
        <p className="text-sm text-muted">An action with no map spot.</p>
      </div>
    </figure>
  );
}
