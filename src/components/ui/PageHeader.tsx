import { Container } from "./Container";
import { Kicker } from "./Surface";
import { KeyArt } from "./KeyArt";

/** Sub-page masthead: centred serif title over a painted atmosphere,
 *  closed by a riveted strip — like the official site's interior pages.
 *  Pulls itself up behind the sticky site chrome so the art runs under the
 *  nav bar; --wg-chrome-h is the header height, or header + sub-nav when a
 *  section layout (e.g. /gnl) sets it. */
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
    <div className="keyart -mt-[var(--wg-chrome-h,var(--wg-header-h))]">
      <KeyArt src="/keyart/feature-undead-city.jpg" position="center 40%" overlay="soft" />
      <Container className="relative z-10 flex flex-col items-center pb-14 pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+3.5rem)] text-center sm:pb-20 sm:pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+5rem)]">
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
