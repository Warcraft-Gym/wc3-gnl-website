import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { KeyArt } from "@/components/ui/KeyArt";
import { DISCORD_URL } from "@/lib/links";

/** Full-bleed, centred hero in the style of the official Reforged page:
 *  gold-foil title lockup → serif headline → grey kicker → gold CTA →
 *  small note. Painted atmosphere comes from `.keyart`. */
export function Hero() {

  return (
    <section className="keyart grain -mt-[var(--wg-header-h)] overflow-hidden">
      {/* Masthead key art. The composition has its light in the centre, so
          the lockup sits on it directly; a soft vignette keeps the copy legible. */}
      <KeyArt src="/keyart/hero-masthead.jpg" position="center 30%" priority overlay="none" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          backgroundImage:
            "radial-gradient(58rem 38rem at 50% 48%, rgba(0,0,0,.72), rgba(0,0,0,.25) 55%, transparent 75%)," +
            "linear-gradient(180deg, rgba(0,0,0,.7) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 68%, rgba(0,0,0,.95) 100%)",
        }}
      />

      <Container className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center pb-20 pt-[calc(var(--wg-header-h)+4rem)] text-center sm:pb-24">
        {/* Logo (placeholder mark for now) */}
        <Image
          src="/logo/logo.png"
          alt="Warcraft III Gym"
          width={350}
          height={350}
          priority
          className="size-[clamp(11rem,8rem+12vw,17rem)] drop-shadow-[0_18px_40px_rgba(0,0,0,.85)]"
        />

        <h1 className="mt-8 max-w-3xl text-[length:var(--wg-text-hero)] font-semibold text-fg [text-shadow:0_3px_28px_rgba(0,0,0,.85)]">
          <span className="inline-flex flex-wrap justify-center gap-x-[0.9em] gap-y-1">
            <span>Learn</span>
            <span>Compete</span>
            <span>Belong</span>
          </span>
        </h1>

        <p className="mt-5 text-[1.1rem] font-normal uppercase tracking-[0.18em] text-muted sm:text-[1.25rem]">
          Free guides · Coaching · Community events
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/learn/new-players" size="lg">
            Start Learning <ArrowRight size={18} />
          </ButtonLink>
          <ButtonLink href={DISCORD_URL} variant="discord" size="lg">
            <DiscordIcon size={20} /> Join the Discord
          </ButtonLink>
        </div>

        <p className="mt-12 text-sm text-muted">
          Guides for every race · A league for every level
        </p>
      </Container>
    </section>
  );
}
