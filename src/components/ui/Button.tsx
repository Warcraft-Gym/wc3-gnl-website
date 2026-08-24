import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

// Skewed parallelogram; inner span counter-skews so text stays upright.
const base =
  "group/btn inline-flex items-center justify-center font-display font-bold uppercase tracking-wider whitespace-nowrap " +
  "transition-[background-color,box-shadow,color,transform] duration-[var(--wg-dur-fast)] ease-[var(--ease-out-expo)] " +
  "[transform:skewX(var(--wg-skew))] hover:[transform:skewX(var(--wg-skew))_translateY(-1px)] active:translate-y-0 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
  "disabled:opacity-50 disabled:pointer-events-none";

const inner = "inline-block [transform:skewX(calc(var(--wg-skew)*-1))]";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-bg-deep hover:shadow-[0_0_36px_-6px_var(--wg-gold-glow)]",
  outline:
    "border-2 border-gold/60 text-gold hover:border-gold hover:bg-gold/10",
  ghost: "text-muted hover:text-gold hover:bg-surface-2",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-9 text-base",
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
      <span className={cn(inner, "flex items-center gap-2")}>{children}</span>
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
        <span className={cn(inner, "flex items-center gap-2")}>{children}</span>
      </a>
    );
  }
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      <span className={cn(inner, "flex items-center gap-2")}>{children}</span>
    </Link>
  );
}
