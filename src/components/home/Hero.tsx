import { ArrowRight, Swords } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Kicker } from "@/components/ui/Surface";
import type { Season } from "@/lib/api/types";

export function Hero({
  season,
  stats,
}: {
  season: Season;
  stats: { teams: number; players: number; live: number };
}) {
  return (
    <section className="grain relative overflow-hidden border-b border-line/70">
      {/* Layered atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(44rem 32rem at 82% 6%, var(--wg-gold-glow), transparent 62%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, var(--wg-line) 0 1px, transparent 1px 58px)",
        }}
      />

      <Container className="relative py-20 sm:py-28 lg:py-32">
        <div className="max-w-4xl">
          <Kicker className="mb-6">
            <Swords size={13} /> {season.name}
          </Kicker>

          <h1 className="text-[length:var(--wg-text-hero)] font-extrabold leading-[0.88]">
            The community
            <br />
            <span className="text-gold [text-shadow:0_0_50px_var(--wg-gold-glow)]">
              Warcraft III
            </span>{" "}
            league
          </h1>

          <p className="mt-7 max-w-xl text-lg text-muted">
            Built by players, for players. Follow the ladder, schedule your
            matches, watch the games, and climb the Gym Newbie League — all in one
            place.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/dashboard" size="lg">
              Enter the Dashboard <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink href="/gnl/schedule" variant="outline" size="lg">
              View Schedule
            </ButtonLink>
          </div>

          {/* Stat readout */}
          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-px overflow-hidden border border-line bg-line">
            {[
              { k: "Teams", v: stats.teams },
              { k: "Players", v: stats.players },
              { k: "Live now", v: stats.live, accent: stats.live > 0 },
            ].map((s) => (
              <div key={s.k} className="bg-surface/90 px-5 py-4">
                <dt className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.2em] text-faint">
                  {s.k}
                </dt>
                <dd
                  className={`tnum mt-1 font-display text-3xl font-extrabold ${
                    s.accent ? "text-live" : "text-fg"
                  }`}
                >
                  {String(s.v).padStart(2, "0")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
