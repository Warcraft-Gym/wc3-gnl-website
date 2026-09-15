import { ArrowRight, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { KeyArt } from "@/components/ui/KeyArt";
import { DISCORD_URL } from "@/lib/links";
import type { Season } from "@/lib/api/types";

/** Full-bleed, centred hero in the style of the official Reforged page:
 *  gold-foil title lockup → serif headline → grey kicker → gold CTA →
 *  small platform note. Painted atmosphere comes from `.keyart`. */
export function Hero({
  season,
  stats,
}: {
  season: Season;
  stats: { teams: number; players: number; live: number };
}) {
  const note = [
    `${stats.teams} teams`,
    `${stats.players} players`,
    stats.live > 0 ? `${stats.live} live now` : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
        {/* Title lockup */}
        <p className="font-display text-[clamp(2.75rem,1rem+6.5vw,6rem)] font-extrabold leading-none tracking-[0.02em] text-foil">
          Warcraft III
        </p>
        <p className="mt-2 font-display text-[clamp(0.85rem,0.6rem+1vw,1.35rem)] font-bold uppercase tracking-[0.55em] text-gold [text-shadow:0_0_24px_var(--wg-gold-glow)]">
          Gym
        </p>

        <h1 className="mt-10 max-w-3xl text-[length:var(--wg-text-hero)] font-semibold text-fg [text-shadow:0_3px_28px_rgba(0,0,0,.85)]">
          Learn the game. Compete in the league.
        </h1>

        <p className="mt-5 text-[1.1rem] font-normal uppercase tracking-[0.18em] text-muted sm:text-[1.25rem]">
          Free Warcraft III guides · {season.name}
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href={DISCORD_URL} size="lg">
            Join the League <ArrowRight size={18} />
          </ButtonLink>
          <ButtonLink href="/learn/new-players" variant="outline" size="lg">
            Start Learning
          </ButtonLink>
        </div>

        <p className="mt-12 text-sm text-muted">{note}</p>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-2 font-display text-[0.8rem] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-fg"
        >
          <MessageCircle size={16} /> Organised on Discord
        </a>
      </Container>
    </section>
  );
}
