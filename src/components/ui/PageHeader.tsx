import { Container } from "./Container";
import { Kicker } from "./Surface";

export function PageHeader({
  kicker,
  title,
  lead,
  children,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden border-b border-line/70">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(36rem 22rem at 85% -20%, var(--wg-gold-glow), transparent 60%)",
        }}
      />
      <Container className="py-14 sm:py-20">
        {kicker ? <Kicker className="mb-4">{kicker}</Kicker> : null}
        <h1 className="text-[length:var(--wg-text-display)] font-extrabold">
          {title}
        </h1>
        {lead ? <p className="mt-4 max-w-2xl text-lg text-muted">{lead}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </Container>
    </div>
  );
}
