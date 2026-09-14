import { Container } from "./Container";
import { Kicker } from "./Surface";
import { KeyArt } from "./KeyArt";

/** Sub-page masthead: centred serif title over a painted atmosphere,
 *  closed by a riveted strip — like the official site's interior pages. */
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
    <div className="keyart">
      <KeyArt src="/keyart/feature-undead-city.jpg" position="center 40%" overlay="soft" />
      <Container className="relative z-10 flex flex-col items-center py-14 text-center sm:py-20">
        {kicker ? <Kicker className="mb-4">{kicker}</Kicker> : null}
        <h1 className="text-[length:var(--wg-text-display)] font-bold [text-shadow:0_2px_24px_rgba(0,0,0,.8)]">
          {title}
        </h1>
        {lead ? (
          <p className="mt-4 max-w-2xl text-lg text-muted">{lead}</p>
        ) : null}
        {children ? (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {children}
          </div>
        ) : null}
      </Container>
      <div className="rivets relative z-10" aria-hidden />
    </div>
  );
}
