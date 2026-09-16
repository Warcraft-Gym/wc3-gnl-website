import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "./Container";
import { Kicker } from "./Surface";
import { KeyArt } from "./KeyArt";

/** Sub-page masthead: centred serif title over a painted atmosphere,
 *  closed by a riveted strip, like the official site's interior pages.
 *  Pulls itself up behind the sticky site chrome so the art runs under the
 *  nav bar; --wg-chrome-h is the header height, or header + sub-nav when a
 *  section layout (e.g. /gnl) sets it. */
export function PageHeader({
  kicker,
  title,
  lead,
  art,
  background,
  backgroundPosition,
  back,
  children,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  /** Optional emblem (e.g. a race crest) shown above the title. */
  art?: string | null;
  /** Painted backdrop; defaults to the shared undead-city scene. */
  background?: string;
  backgroundPosition?: string;
  /** Optional "back" link pinned to the top-left of the masthead. */
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="keyart -mt-[var(--wg-chrome-h,var(--wg-header-h))]">
      <KeyArt
        src={background ?? "/keyart/feature-undead-city.webp"}
        position={backgroundPosition ?? "center 40%"}
        overlay="soft"
      />
      {/* Centre vignette so the emblem and title read over busy art */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(50rem_30rem_at_50%_58%,rgba(0,0,0,.7),rgba(0,0,0,.25)_55%,transparent_75%)]"
      />
      {back ? (
        <Container className="relative z-10">
          <Link
            href={back.href}
            className="absolute left-5 top-[calc(var(--wg-chrome-h,var(--wg-header-h))+0.75rem)] inline-flex h-9 items-center gap-1.5 rounded border border-line bg-bg/60 px-3 text-xs uppercase tracking-wide text-muted backdrop-blur transition-colors hover:border-gold/50 hover:text-gold sm:left-8"
          >
            <ArrowLeft size={14} /> {back.label}
          </Link>
        </Container>
      ) : null}
      <Container className="relative z-10 flex flex-col items-center pb-14 pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+3.5rem)] text-center sm:pb-20 sm:pt-[calc(var(--wg-chrome-h,var(--wg-header-h))+5rem)]">
        {art ? (
          <span className="relative mb-5 block size-[clamp(7.5rem,6rem+6vw,11rem)]">
            <span
              aria-hidden
              className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,var(--wg-gold-glow),transparent_70%)] opacity-70 blur-xl"
            />
            <Image
              src={art}
              alt=""
              fill
              priority
              sizes="176px"
              className="object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,.85)]"
            />
          </span>
        ) : null}
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
