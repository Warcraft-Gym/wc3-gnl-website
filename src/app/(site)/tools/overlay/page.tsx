import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Apple, ChevronDown, Download, FileInput, Keyboard, Layers } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { OVERLAY_RELEASES_URL, getOverlayRelease } from "@/lib/overlay";
import { OVERLAY_BETA_LIVE } from "@/lib/flags";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/overlay" },
  title: "Build order overlay",
  description:
    "A desktop app that shows a Warcraft 3 Gym build order on top of Warcraft III while you play, with a clock and global shortcuts. Keep private builds and import them from a replay or a W3Champions match. Windows and macOS, beta.",
  openGraph: {
    title: "Build order overlay · Warcraft 3 Gym",
    description: "Float any build order over the game, with a play-along clock and global shortcuts.",
    images: [{ url: "/overlay/in-game.webp", width: 1920, height: 1080 }],
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
    Icon: FileInput,
    title: "Any build, yours included",
    body: "Every build on the site, synced on its own. Write your own private builds, or make one from a replay or a W3Champions match.",
  },
];

const STEPS = [
  "Install the app and open it. The picker window lists every build on the site.",
  "Pick a build and click Show overlay, or press the toggle shortcut. The panel floats on top of the game.",
  "Run Warcraft III in windowed or borderless mode. Exclusive fullscreen hides every other window, including the overlay.",
  "At the match's 0:00, press play. The current step highlights as the clock runs; use next and previous if it drifts.",
];

const SHORTCUTS = [
  ["Toggle overlay", "Ctrl+Shift+O", "⌘⇧O"],
  ["Play / pause clock", "Ctrl+Shift+P", "⌘⇧P"],
  ["Reset clock", "Ctrl+Shift+R", "⌘⇧R"],
  ["Next step", "Ctrl+Shift+]", "⌘⇧]"],
  ["Previous step", "Ctrl+Shift+[", "⌘⇧["],
];

const REPLAY_NOTES = [
  "Steps are the orders you gave, not what happened: a cancelled order still shows up.",
  "Food counts are estimated from a fixed cost table and do not account for units that died.",
  "Heroes appear when they were ordered, not when they finished training.",
  "Replays from before patch 1.32 cannot be read.",
];

/** A collapsed block for the details most people do not need on day one. */
function More({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-line/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-[0.95rem] font-bold uppercase tracking-[0.06em] text-fg transition-colors group-hover:text-gold">{title}</span>
        <ChevronDown size={18} className="shrink-0 text-gold transition-transform group-open:rotate-180" />
      </summary>
      <div className="max-w-3xl pb-8 text-sm leading-6 text-muted">{children}</div>
    </details>
  );
}

export default async function OverlayPage() {
  if (!OVERLAY_BETA_LIVE) notFound();
  const release = await getOverlayRelease();

  return (
    <>
      <PageHeader
        kicker="Tools · Beta"
        title="Build order overlay"
        lead="Stop alt-tabbing to check a build. This little app keeps the steps, food counts and clock on top of the game. Beta: expect rough edges, and tell us about them."
      >
        {release?.windowsInstaller ? (
          <ButtonLink href={release.windowsInstaller} size="md">
            <Download size={16} /> Windows installer
          </ButtonLink>
        ) : null}
        {release?.windowsPortable ? (
          <ButtonLink href={release.windowsPortable} size="md">
            <Download size={16} /> Windows portable
          </ButtonLink>
        ) : null}
        {release?.macDmg ? (
          <ButtonLink href={release.macDmg} size="md">
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

        {/* One composition: the overlay in an actual game, with the picker window
            tucked over its bottom-right corner */}
        <figure className="relative mt-4 sm:mb-24">
          <Image
            src="/overlay/in-game.webp"
            alt="The overlay panel floating over a Warcraft III game: a Night Elf base at 0:10 with the build's steps, icons and food counts listed on the left."
            width={1920}
            height={1080}
            priority
            sizes="(max-width: 640px) 100vw, 72rem"
            className="h-auto w-full rounded border border-line shadow-[0_24px_60px_-20px_rgba(0,0,0,.9)]"
          />
          {/* Phones stack the picker under the game shot; wider screens tuck it over the corner */}
          <Image
            src="/overlay/picker.webp"
            alt="The overlay's build picker window: race filters, search and the list of builds with a Use in game button on each."
            width={1920}
            height={1280}
            sizes="(max-width: 640px) 100vw, 24rem"
            className="mt-4 h-auto w-full rounded border border-line shadow-[0_24px_60px_-12px_rgba(0,0,0,.95)] sm:absolute sm:-bottom-16 sm:right-[-3%] sm:mt-0 sm:w-[24rem]"
          />
          <figcaption className="mt-3 text-sm text-muted sm:absolute sm:-bottom-16 sm:left-0 sm:mt-0 sm:max-w-[40%]">
            Pick a build in the picker window, then the panel stays on top of the game while you play.
          </figcaption>
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

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <section>
            <p className="kicker mb-4">Get started</p>
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

          <section className="panel border-arcane/40 p-6">
            <p className="kicker">Before you install</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li className="flex gap-2"><span className="text-gold">·</span> Windows 10/11 (Windows 10 needs the WebView2 runtime once) or macOS 12+.</li>
              <li className="flex gap-2"><span className="text-gold">·</span> Not code-signed yet: Windows shows a SmartScreen prompt (More info, Run anyway); on macOS right-click the app and choose Open the first time.</li>
              <li className="flex gap-2"><span className="text-gold">·</span> The portable exe needs no install and no admin rights.</li>
            </ul>
          </section>
        </div>

        {/* Everything else folds away until someone needs it */}
        <section className="mt-14 border-b border-line/60">
          <p className="kicker mb-2">Going further</p>

          <More title="Shortcuts">
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
          </More>

          <More title="Your own private builds">
            <p>
              New private build in the picker opens an editor with the same steps, icons and rules as the site&apos;s form; Duplicate any site build to start from it. Private builds are marked in the list, work offline and never leave your computer unless you export them.
            </p>
            <p className="mt-3">
              Export saves a build as a <span className="font-mono text-xs text-fg">.wc3gym.json</span> file to back it up or send to a friend; Import builds (Settings) reads one back. Submit to site opens the{" "}
              <Link href="/learn/builds/submit" className="text-gold hover:underline">
                submit form
              </Link>{" "}
              with the build loaded, so sharing it with everyone is one review away.
            </p>
          </More>

          <More title="Make a build from a replay or a W3Champions match">
            <p>
              Import replay (top bar) reads a <span className="font-mono text-xs text-fg">.w3g</span> file and lists both players; pick the one you were. Import up to trims how much of the game becomes steps (eight minutes by default), and you can leave upgrades and items out. Open in editor lands the draft in the build editor to tidy up. From W3Champions does the same from a match link: the replay is fetched from their public API, nothing is uploaded.
            </p>
            <p className="mt-3">
              Windows keeps replays in Documents\Warcraft III\BattleNet\&lt;account&gt;\Replays; on macOS they are in ~/Library/Application Support/Blizzard/Warcraft III, with the last game at Replay/LastReplay.w3g.
            </p>
            <p className="mt-4 font-display text-[0.72rem] font-bold uppercase tracking-[0.12em] text-fg">What an import cannot know</p>
            <ul className="mt-2 space-y-1.5">
              {REPLAY_NOTES.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="text-gold">·</span>
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-faint">
              No app at hand? The site&apos;s{" "}
              <Link href="/learn/builds/submit" className="text-gold hover:underline">
                submit form
              </Link>{" "}
              takes a replay or a match link too.
            </p>
          </More>
        </section>
      </Container>
    </>
  );
}
