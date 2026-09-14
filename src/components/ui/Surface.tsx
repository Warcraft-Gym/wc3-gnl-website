import { cn } from "@/lib/utils";

/** Translucent warm panel — the core visual unit. `notch` is kept for
 *  call-site compatibility and now just rounds the corners a little more. */
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
        "panel",
        notch && "clip-notch",
        interactive &&
          "transition-[border-color,background-color,transform,box-shadow] duration-[var(--wg-dur)] ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_0_0_1px_var(--wg-line-strong),0_16px_40px_-18px_var(--wg-gold-glow)]",
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
        {lead ? <p className="mt-3 text-muted">{lead}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
