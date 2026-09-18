# Warcraft 3 Gym — desktop overlay

A small Tauri v2 desktop app (`apps/overlay`) that shows a build order in a
transparent, always-on-top, borderless window while you play — pick a build
from a normal window, then toggle a floating overlay-v panel on top of the
game with a global shortcut. It reads the same public JSON API the site
serves (`/api/builds`).

## Prerequisites

- **Warcraft III must run in windowed or borderless (windowed) mode.**
  Exclusive fullscreen owns the whole screen and hides every other window,
  including the overlay. In Reforged: **Options → Video → Window Mode →
  Windowed** or **Borderless Windowed** (not "Fullscreen").
- **Windows 10/11.** Windows 11 ships WebView2 preinstalled. Windows 10
  needs the [WebView2 Evergreen bootstrapper](https://developer.microsoft.com/microsoft-edge/webview2/)
  installed once.
- **macOS 12+.**

## Install on Windows

1. Download the `.exe` installer (NSIS) from the latest
   [GitHub Release](../../releases).
2. The build is unsigned, so Windows SmartScreen will show
   **"Windows protected your PC"**. Click **More info → Run anyway** to
   continue — this is expected until the app is code-signed.
3. First launch opens the **picker** window: pick a build, then click
   **Show overlay** to open the floating build-order panel (or press
   `Ctrl+Shift+O`).
4. Settings (API base, shortcuts, overlay opacity/scale) are stored in the
   app's WebView local storage, not a config file under `%APPDATA%`.
   Uninstalling the app clears this app data along with it.

### Portable (no install)

Prefer not to install anything? Download the `_portable.exe` asset from the
same [GitHub Release](../../releases) instead of the NSIS installer, put it
anywhere (a folder, a USB stick — no installer, no admin rights), and run
it directly.

- Windows SmartScreen still shows **"Windows protected your PC"** for this
  unsigned build — **More info → Run anyway**, same as the installed version.
- Requires the [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/)
  (preinstalled on Windows 11; Windows 10 needs the Evergreen bootstrapper
  once — see Prerequisites above).
- Settings still live in `%LOCALAPPDATA%`, not beside the exe — moving or
  deleting the portable exe does not move or delete your settings.

## Install on macOS

1. Download the `.dmg` from the latest
   [GitHub Release](../../releases).
2. Because the build is unsigned, Gatekeeper blocks a normal double-click
   open. **Right-click the app → Open → Open** (only needed once).

## Shortcuts

| Action | Windows/Linux | macOS | What it does |
|---|---|---|---|
| Toggle overlay | `Ctrl+Shift+O` | `⌘⇧O` | Show/hide the floating overlay window |
| Play / pause timer | `Ctrl+Shift+P` | `⌘⇧P` | Start or pause the build-order clock |
| Reset timer | `Ctrl+Shift+R` | `⌘⇧R` | Reset the clock to 0:00 |
| Next step | `Ctrl+Shift+]` | `⌘⇧]` | Jump the clock to the next timed step |
| Previous step | `Ctrl+Shift+[` | `⌘⇧[` | Jump the clock to the previous timed step |

Change any combo from the picker's **Settings → Shortcuts** panel: click
**Change**, then press the new combo (Escape cancels the capture without
closing the Settings dialog). A modifier combo needs Ctrl, Alt, or ⌘; a
single **function key** (F1–F12, and F13–F24 if your keyboard has them) or
one of Insert, Delete, Home, End, PageUp, PageDown, Pause, ScrollLock also
works on its own, no modifier required — press it and it's accepted
immediately. Pressing any other key alone (a letter, digit, etc.) does
nothing to the stored combo and shows an inline reason instead
(`Use Ctrl/Alt/⌘ + key, or a function key…`); it clears on your next
accepted press or Escape.

If a row shows a warning after **"Not registered:"**, that's the real error
the OS/plugin returned — usually another application (or a **second copy**
of this overlay **already running**) already owns that combo globally. Pick
a different combo, close the other app, or click **Re-register** to retry
the current combos without changing anything (useful right after quitting
whatever was holding the shortcut).

## Using it in a game

1. In the picker, select a build from the list and click **Show overlay**.
2. Alt-tab into Warcraft III (windowed/borderless — see Prerequisites).
3. At the game clock's **0:00** (match start), press **play**
   (`Ctrl+Shift+P` / `⌘⇧P`) on the overlay timer.
4. Use **next step** / **prev step** to resync the highlighted step if the
   timer drifts from the in-game clock.
5. The step list header labels each column ("#", "Time", "Food", "Step");
   a Time or Food column only appears when the selected build actually has
   that data, and a step with no value for a shown column just leaves the
   cell blank instead of showing a placeholder.

## Private builds

Private build orders are stored **only on this computer** (`localStorage`,
key `wc3gym.localBuilds`) — they are never sent to the site. They show up
in the picker's build list marked with a **PRIVATE** badge, always at the
top, and work exactly like a published build for the in-game panel:
select one and click **Show overlay** the same way. A **Source** filter in
the picker (All / Private / Site) narrows the list to just one kind.
Private builds render with or without a network connection — they never
depend on the site's `/api/builds` endpoint.

### Creating and editing a private build

- **New private build** (top bar) opens a blank editor: title, race,
  opponents, difficulty, patch, tags, summary, author, and a "More fields"
  group for the optional Discord/source-URL/description fields, plus a
  **Steps** section — add, reorder, and remove steps, each with an optional
  time (`m:ss`), food count, icon, and instruction. Click a step's icon
  button to open the icon picker (grouped by race, searchable by name,
  loaded from the site's `/api/icons`).
- Every row has small **Duplicate** / **Edit** / **Delete** buttons
  (Edit/Delete only on private rows) — Duplicate works on *any* row
  (private or published) and opens the editor pre-filled with
  `"<title> (copy)"`, ready to tweak and save as a new private build. The
  selected build's header also gets an **Edit** button when it's private.
- Saving validates with the **exact same rules the site's own build
  submission form uses** (title/summary length, tag limits, `m:ss` step
  times, 0–100 food, etc.), so a private build is already in shape to
  submit to the site unchanged — except a private build only needs one
  step, where a public submission needs at least three.
- Closing the editor with unsaved changes (Cancel, Escape, or clicking the
  backdrop) asks you to confirm before discarding; deleting a build asks
  for confirmation too.

### Backing up, sharing, and submitting a private build

Private builds live only in this app's local storage — reinstalling the
app, clearing the WebView's storage, or moving to a new computer loses
them unless you've exported a copy first. **Export** and **Import** turn a
private build into a plain `.json` file you control:

- **Export** (on a private row, and on the selected build's header) saves
  one build as `<title>.wc3gym.json`. **Export all private builds**
  (Settings) saves every private build in a single file. On Windows/macOS
  this opens the native save dialog; in browser mode it downloads the file
  like any other download.
- **Import builds…** (Settings) opens a file you've exported (or one a
  friend sent you) and adds whatever's in it to your private builds.
  Importing the same file twice is safe — a build already present (same
  title and steps) is skipped, not duplicated, and every private build
  gets a fresh ID on import so importing on two machines never collides.
  A status line reports **"Imported N, skipped M"** after each import.
- **Submit to site** (on a private row, and on the selected build's
  header) opens the site's build-submission page in your browser — it
  does not send anything automatically. Export the build first if you
  want the exact JSON to reference while filling out the form, or just
  use it as a shortcut to the page.

Exported files are plain JSON — safe to keep in a backup folder, a git
repo, or a shared drive, and safe to open in a text editor to see exactly
what a build contains before importing it.

## Build locally

```bash
# Native app (real Tauri windows)
pnpm --filter wc3gym-overlay tauri dev
pnpm --filter wc3gym-overlay tauri build

# Browser mode (no Tauri windows — picker.html/overlay.html as tabs)
pnpm --filter wc3gym-overlay dev
# then open http://localhost:5173/picker.html?api=http://localhost:3111

# Validate tauri.conf.json + capabilities against the mission's requirements
pnpm --filter wc3gym-overlay check:config
```

Site fonts (Cinzel/Lato/JetBrains Mono) and key-art are bundled in `apps/overlay` via `@fontsource` and local `public/` copies, so the app renders identically offline.

## Release

Before tagging, bump the version in all three of `apps/overlay/package.json`,
`src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` (plus `Cargo.lock`'s
own `wc3gym-overlay` package entry), then confirm with
`pnpm --filter wc3gym-overlay check:config`.

Tag a commit to build and publish installers via GitHub Actions:

```bash
git tag overlay-v0.1.0
git push origin overlay-v0.1.0
```

The `Overlay release` workflow (`.github/workflows/overlay-release.yml`)
builds Windows (NSIS + MSI) and macOS (DMG, universal binary) installers,
attaches them to a new GitHub Release, and also uploads a raw
`_portable.exe` (see "Portable (no install)" above) to the same Release.
You can also trigger the workflow manually (`workflow_dispatch`) to build
and upload workflow artifacts — including the portable exe as the
`portable-windows` artifact — without publishing a release, useful for
testing the pipeline.

The tag's version must match `apps/overlay/package.json` and
`src-tauri/tauri.conf.json` (`pnpm --filter wc3gym-overlay check:config`
enforces that the two stay equal).

## Troubleshooting

- **Overlay not visible.** Confirm Warcraft III is windowed/borderless, not
  exclusive fullscreen. Press the toggle shortcut (`Ctrl+Shift+O` / `⌘⇧O`)
  or click **Show overlay** again in the picker. Check that "always on top"
  hasn't been defeated by another always-on-top window.
- **Shortcuts not working.** Another app may already own that global
  combo — open **Settings → Shortcuts** and look for the "Not registered"
  warning, then change the combo.
- **All shortcuts show "Not registered".** Before 0.1.2 this usually meant
  a second copy of the app was already running and had claimed every
  global shortcut, leaving the new copy's registrations to fail silently.
  From 0.1.2 the app quits fully when the picker window closes on every
  platform (it used to leave the hidden overlay window, and the process
  behind it, running invisibly). On **Windows and Linux**, 0.1.2 also adds
  a single-instance guard: launching the app again while one is already
  running just focuses the existing picker instead of starting a second
  process. **macOS** does not register this guard (registering it renders
  the picker window blank on macOS) — a `.app` bundle launched from
  Finder/Launchpad is already single-instance via Launch Services, so
  running the raw dev/debug binary twice from a terminal is the only way
  to get two copies on macOS. If a copy is genuinely frozen (not just
  hidden) rather than merely already running, end it from Task Manager
  (Windows) / Activity Monitor (macOS), or use the **Quit app** button in
  Settings, then relaunch.
- **Build list is empty.** Check the **API base** setting (Settings
  dialog) points at the right site origin — the default is
  `https://wc3-gnl-website.vercel.app`; if the offline banner is
  showing, the app is using a cached list because it couldn't reach the
  API. Note that `/api/builds` only serves data once the site deployment
  that ships it is live — until then a fresh install correctly shows the
  empty state.
- **Blank/white window on Windows.** The WebView2 runtime is missing —
  install the Evergreen bootstrapper (see Prerequisites) and relaunch.
- **The game pauses when I show the overlay.** Fixed — the overlay window
  is declared non-focusable (`focusable: false` / `focus: false` in
  `tauri.conf.json`) and `showWindow`/`toggleWindow` never call `setFocus()`
  on it, so showing or hiding the panel (button or shortcut) does not
  activate the app and pause a single-player game. On macOS, clicking
  *inside* the panel can still bring the whole app forward (a system
  behavior outside the app's control even with `acceptFirstMouse`) —
  prefer the keyboard shortcuts over clicking the panel while playing.

## Manual checklist (Windows)

Run through this once per release build before announcing it. Record each
line as **pass/fail + notes**.

- [ ] **M-1** — Install the `.exe` from the GitHub Release (SmartScreen →
  More info → Run anyway) and confirm the picker lists builds served from
  `wc3-gnl-website.vercel.app`.
  _record: pass/fail + notes:_
- [ ] **M-2** — With Warcraft III running borderless, open the overlay via
  the picker button and via `Ctrl+Shift+O`; confirm it stays on top while
  the game window has focus, and that the game is still readable behind
  the transparent panel.
  _record: pass/fail + notes:_
- [ ] **M-3** — With the game focused, `Ctrl+Shift+P`, `Ctrl+Shift+R`,
  `Ctrl+Shift+]` and `Ctrl+Shift+[` all work; the panel can be dragged by
  its header; its position survives an app restart.
  _record: pass/fail + notes:_
- [ ] **M-4** — Change a shortcut in Settings and confirm the new combo
  takes effect immediately, with no app restart required.
  _record: pass/fail + notes:_
- [ ] **M-5** — Showing/hiding the overlay (shortcut and button) and
  clicking its buttons does not pause a single-player game.
  _record: pass/fail + notes:_
