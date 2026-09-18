import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Apple, BookOpen, Download, Keyboard, Layers, Timer } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { DiscordIcon } from "@/components/ui/DiscordIcon";
import { DISCORD_BUILDS_CHANNEL_URL } from "@/lib/links";
import { OVERLAY_DOCS_URL, OVERLAY_RELEASES_URL, getOverlayRelease } from "@/lib/overlay";
import { OVERLAY_BETA_LIVE } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Build order overlay",
  description:
    "A desktop app that shows a Warcraft 3 Gym build order on top of Warcraft III while you play, with a clock and global shortcuts. Windows and macOS, beta.",
  openGraph: {
    title: "Build order overlay · Warcraft 3 Gym",
    description: "Float any build order over the game, with a play-along clock and global shortcuts.",
    images: [{ url: "/overlay/picker.webp", width: 1920, height: 1280 }],
  },
};

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
    title: "Same builds as the site",
    body: "Pick any build order from the Gym, including the ones you submit. It syncs from the site, so new builds show up on their own.",
  },
];

const SHORTCUTS = [
  ["Toggle overlay", "Ctrl+Shift+O", "⌘⇧O"],
  ["Play / pause clock", "Ctrl+Shift+P", "⌘⇧P"],
  ["Reset clock", "Ctrl+Shift+R", "⌘⇧R"],
  ["Next step", "Ctrl+Shift+]", "⌘⇧]"],
  ["Previous step", "Ctrl+Shift+[", "⌘⇧["],
];

const STEPS = [
  "Install the app and open it. The picker window lists every build on the site.",
  "Pick a build and click Show overlay, or press the toggle shortcut. The panel floats on top of the game.",
  "Run Warcraft III in windowed or borderless mode. Exclusive fullscreen hides every other window, including the overlay.",
  "At the match's 0:00, press play. The current step highlights as the clock runs; use next and previous if it drifts.",
];

export default async function OverlayPage() {
  if (!OVERLAY_BETA_LIVE) notFound();
  const release = await getOverlayRelease();

  return (
    <>
      <PageHeader
        kicker="Tools · Beta"
        title="Build order overlay"
        lead="A small desktop app that shows the build order on top of Warcraft III while you play. It is early, and we are looking for players to try it and tell us what breaks."
      >
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
      </PageHeader>

      <Container className="py-10">
        {release ? (
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
            Latest release v{release.version}
          </p>
        ) : null}

        {/* Screenshots: the picker window with the floating panel over its corner */}
        <figure className="relative mt-4 sm:mr-[7.5rem]">
          <Image
            src="/overlay/picker.webp"
            alt="The overlay's build picker window: race filters, search and the list of builds with a Use in game button on each."
            width={1920}
            height={1280}
            priority
            sizes="(max-width: 640px) 100vw, 64rem"
            className="h-auto w-full rounded border border-line shadow-[0_24px_60px_-20px_rgba(0,0,0,.9)]"
          />
          <Image
            src="/overlay/panel.webp"
            alt="The floating overlay panel: the build's steps with icons, food counts, the clock at 3:10 and the current step highlighted."
            width={760}
            height={1040}
            sizes="(max-width: 640px) 40vw, 16rem"
            className="absolute -bottom-6 right-[-4%] w-[40%] rounded border border-line shadow-[0_24px_60px_-16px_rgba(0,0,0,.95)] sm:-right-[7.5rem] sm:w-[16rem]"
          />
        </figure>

        <ul className="mt-14 grid gap-4 sm:grid-cols-3">
          {POINTS.map(({ Icon, title, body }) => (
            <li key={title} className="panel p-5">
              <Icon size={18} className="text-arcane" />
              <p className="mt-2 font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-fg">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <section>
            <p className="kicker mb-4">How to use it</p>
            <ol className="space-y-4">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-4">
                  <span className="btn-gold grid size-8 shrink-0 place-items-center rounded font-display text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-6 text-muted">{s}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <p className="kicker mb-4">Shortcuts</p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
                  <th className="py-2 font-medium">Action</th>
                  <th className="py-2 font-medium">Windows</th>
                  <th className="py-2 font-medium">macOS</th>
                </tr>
              </thead>
              <tbody>
                {SHORTCUTS.map(([action, win, mac]) => (
                  <tr key={action} className="border-t border-line/50">
                    <td className="py-2 text-fg">{action}</td>
                    <td className="py-2 font-mono text-xs text-muted">{win}</td>
                    <td className="py-2 font-mono text-xs text-muted">{mac}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-faint">Every combo can be changed in the app&apos;s Settings.</p>
          </section>
        </div>

        <section className="panel mt-14 border-arcane/40 p-6 sm:p-8">
          <p className="kicker">Before you install</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><span className="text-gold">·</span> Windows 10/11 (Windows 10 needs the WebView2 runtime once) or macOS 12+.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> The build is not code-signed yet. Windows shows a SmartScreen prompt (More info, Run anyway); on macOS right-click the app and choose Open the first time.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> The portable exe needs no install and no admin rights.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={OVERLAY_DOCS_URL} variant="outline" size="md" target="_blank" rel="noreferrer">
              <BookOpen size={16} /> Full setup guide
            </ButtonLink>
            <ButtonLink href={DISCORD_BUILDS_CHANNEL_URL} variant="discord" size="md" target="_blank" rel="noreferrer">
              <DiscordIcon size={18} /> Report a problem
            </ButtonLink>
          </div>
        </section>
      </Container>
    </>
  );
}
