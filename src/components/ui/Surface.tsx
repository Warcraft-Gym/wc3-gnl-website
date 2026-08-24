import { cn } from "@/lib/utils";

/** Angular surface panel — the core visual unit. Optional notched corner. */
export function Surface({
  className,
  children,
  interactive = false,
  notch = false,
  as: Tag = "div",
}: {
  className?: string;
  children: React.ReactNode;
  interactive?: boolean;
  notch?: boolean;
  as?: React.ElementType;
}) {
  return (
    <Tag
      className={cn(
        "relative border border-line bg-surface/85",
        notch && "clip-notch",
        interactive &&
          "transition-[border-color,background-color,transform] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/60 hover:bg-surface-2/85",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Small uppercase kicker/eyebrow label with an accent tick. */
export function Kicker({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("kicker", className)}>{children}</p>;
}

/** Section heading block: kicker + title + optional lead. */
export function SectionHead({
  kicker,
  title,
  lead,
  className,
  action,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {kicker ? <Kicker className="mb-3">{kicker}</Kicker> : null}
        <h2 className="text-[length:var(--wg-text-title)]">{title}</h2>
        {lead ? <p className="mt-3 normal-case text-muted">{lead}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
