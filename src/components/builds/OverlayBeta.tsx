import { Apple, BookOpen, Download, Keyboard, Layers, MonitorPlay, Timer } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_BUILDS_CHANNEL_URL } from "@/lib/links";
import { OVERLAY_DOCS_URL, OVERLAY_RELEASES_URL, type OverlayRelease } from "@/lib/overlay";

const POINTS = [
  {
    Icon: Layers,
    title: "Floats over the game",
    body: "A transparent, always-on-top panel with the steps, food count and clock. Drag it wherever it does not get in the way.",
  },
  {
    Icon: Keyboard,
    title: "Hands stay on the keyboard",
    body: "Global shortcuts toggle the panel, start the clock and jump between steps without alt-tabbing.",
  },
  {
    Icon: Timer,
    title: "Same builds as this page",
    body: "Pick any build order from the site, including the ones you submit. It syncs from the site, so new builds show up on their own.",
  },
];

/** "Try the overlay" beta section on the build list: what it is, the latest
 *  downloads from GitHub Releases, and where to report problems. */
export function OverlayBeta({ release }: { release: OverlayRelease | null }) {
  return (
    <section className="panel relative mt-14 overflow-hidden border-arcane/40 p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ backgroundImage: "radial-gradient(30rem 16rem at 0% 0%, oklch(55% 0.16 255 / 0.28), transparent 65%)" }}
      />
      <div className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="kicker flex items-center gap-2">
              <MonitorPlay size={14} /> Desktop overlay
              <span className="rounded border border-arcane/50 px-1.5 py-0.5 font-mono text-[0.6rem] tracking-[0.16em] text-arcane">
                Beta
              </span>
            </p>
            <h2 className="mt-2 text-[length:var(--wg-text-title)]">Take a build into the game</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted sm:text-[0.95rem]">
              A small desktop app that shows the build order on top of Warcraft III while you play. It is early
              and we are looking for players to try it and tell us what breaks.
            </p>
          </div>
          {release ? (
            <p className="shrink-0 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
              v{release.version}
            </p>
          ) : null}
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {POINTS.map(({ Icon, title, body }) => (
            <li key={title} className="rounded border border-line/70 bg-bg/40 p-4">
              <Icon size={18} className="text-arcane" />
              <p className="mt-2 font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-fg">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          {release?.windowsInstaller ? (
            <ButtonLink href={release.windowsInstaller} size="md">
              <Download size={16} /> Windows installer
            </ButtonLink>
          ) : null}
          {release?.windowsPortable ? (
            <ButtonLink href={release.windowsPortable} variant="outline" size="md">
              <Download size={16} /> Windows portable
            </ButtonLink>
          ) : null}
          {release?.macDmg ? (
            <ButtonLink href={release.macDmg} variant="outline" size="md">
              <Apple size={16} /> macOS
            </ButtonLink>
          ) : null}
          {!release ? (
            <ButtonLink href={OVERLAY_RELEASES_URL} size="md" target="_blank" rel="noreferrer">
              <Download size={16} /> Download from GitHub
            </ButtonLink>
          ) : null}
          <ButtonLink href={OVERLAY_DOCS_URL} variant="ghost" size="md" target="_blank" rel="noreferrer">
            <BookOpen size={16} /> Setup guide
          </ButtonLink>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-line/60 pt-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl">
            Run Warcraft III in windowed or borderless mode, not exclusive fullscreen. The build is not code-signed
            yet, so Windows shows a SmartScreen prompt (More info, Run anyway) and macOS needs a right-click, Open
            the first time.
          </p>
          <ButtonLink
            href={DISCORD_BUILDS_CHANNEL_URL}
            variant="discord"
            size="sm"
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
          >
            <DiscordIcon size={15} /> Report a problem
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
