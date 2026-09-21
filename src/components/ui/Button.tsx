import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "discord";
type Size = "sm" | "md" | "lg";

// Blizzard-style CTA: squared corners, serif uppercase label, burnished gold
// gradient for the primary action.
// Full-width on phones so CTA groups stack cleanly; inline from `sm` up.
const base =
  "inline-flex items-center justify-center gap-2 rounded font-display font-bold uppercase tracking-[0.08em] whitespace-nowrap max-sm:w-full " +
  "transition-[background-color,border-color,box-shadow,color,transform] duration-[var(--wg-dur-fast)] ease-[var(--ease-out-expo)] " +
  "hover:-translate-y-px active:translate-y-0 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "btn-gold",
  outline:
    "border border-gold/50 bg-surface/40 text-gold hover:border-gold hover:bg-gold/10",
  // Quiet but still a button: a faint border and a fill on hover.
  ghost: "border border-line bg-surface/30 text-muted hover:border-gold/50 hover:bg-surface-2/70 hover:text-gold",
  /** Discord Blurple (#5865F2) per discord.com/branding, for links into the server. */
  discord:
    "bg-[#5865F2] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_1px_2px_rgba(0,0,0,.6)] hover:bg-[#4752C4] hover:shadow-[0_0_28px_-6px_rgba(88,101,242,.7)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.72rem]",
  md: "h-11 px-6 text-[0.8rem]",
  lg: "h-14 px-9 text-[0.95rem]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...rest
}: CommonProps & { href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >) {
  const external = href.startsWith("http");
  if (external) {
    return (
      <a
        href={href}
        className={cn(base, variants[variant], sizes[size], className)}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
