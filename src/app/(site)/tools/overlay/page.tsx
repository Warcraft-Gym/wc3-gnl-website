import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Apple, Download, FileInput, Keyboard, Layers, Lock, Share2, Timer } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { OVERLAY_RELEASES_URL, getOverlayRelease } from "@/lib/overlay";
import { OVERLAY_BETA_LIVE } from "@/lib/flags";

export const metadata: Metadata = {
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
    Icon: Timer,
    title: "Same builds as the site",
    body: "Pick any build order from the Gym, including the ones you submit. It syncs from the site, so new builds show up on their own.",
  },
  {
    Icon: Lock,
    title: "Your own private builds",
    body: "Write a build of your own, or duplicate and tweak any site build. Private builds stay on your computer and work offline.",
  },
  {
    Icon: FileInput,
    title: "Start from a replay",
    body: "Turn one of your replays, or any W3Champions match link, into a build in two clicks: pick which player you were, trim how far into the game to go, open it in the editor.",
  },
  {
    Icon: Share2,
    title: "Export, share, submit",
    body: "Export a private build as a JSON file to back it up or send it to a friend, and submit it to the site from the app when it is ready for everyone.",
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
  "Want a build that is not on the site? New private build in the picker opens an editor with the same steps, icons and rules as the site's form. Duplicate any build to start from it. Private builds are marked in the list and never leave your computer unless you export them.",
  "Played a game you want to keep? Import replay takes a .w3g file, From W3Champions takes a match link. Choose which player you were and the editor opens with the timed steps, icons, race and opponent already filled in.",
];

const REPLAY_NOTES = [
  "Steps are the orders you gave, not what happened: a cancelled order still shows up.",
  "Food counts are estimated from a fixed cost table and do not account for units that died.",
  "Heroes appear when they were ordered, not when they finished training.",
  "Replays from before patch 1.32 cannot be read.",
];

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

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <section className="mt-14 grid gap-10 lg:grid-cols-2">
          <div>
            <p className="kicker mb-4">From a replay to a build</p>
            <p className="text-sm leading-6 text-muted">
              Import replay (top bar) reads a <span className="font-mono text-xs text-fg">.w3g</span> file from your Replays folder and lists both players; pick the one you were. Import up to trims how much of the game becomes steps (eight minutes by default), and you can leave upgrades and items out. Open in editor lands the draft in the build editor, where you tidy it up like any other private build. From W3Champions does the same from a match link: the replay is fetched from their public API, nothing is uploaded.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              The same import lives on the site: the{" "}
              <Link href="/learn/builds/submit" className="text-gold hover:underline">
                submit form
              </Link>{" "}
              takes a replay or a match link too, if you want to share a build without the app.
            </p>
          </div>
          <div>
            <p className="kicker mb-4">What an import cannot know</p>
            <ul className="space-y-2 text-sm text-muted">
              {REPLAY_NOTES.map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="text-gold">·</span>
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-faint">
              Windows keeps replays in Documents\Warcraft III\BattleNet\&lt;account&gt;\Replays. On macOS they are in ~/Library/Application Support/Blizzard/Warcraft III, with the last game at Replay/LastReplay.w3g.
            </p>
          </div>
        </section>

        <section className="panel mt-14 border-arcane/40 p-6 sm:p-8">
          <p className="kicker">Before you install</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><span className="text-gold">·</span> Windows 10/11 (Windows 10 needs the WebView2 runtime once) or macOS 12+.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> The build is not code-signed yet. Windows shows a SmartScreen prompt (More info, Run anyway); on macOS right-click the app and choose Open the first time.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> The portable exe needs no install and no admin rights.</li>
          </ul>
        </section>
      </Container>
    </>
  );
}
