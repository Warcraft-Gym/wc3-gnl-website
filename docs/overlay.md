# Warcraft 3 Gym — desktop overlay

A small Tauri v2 desktop app (`apps/overlay`) that shows a build order in a
transparent, always-on-top, borderless window while you play — pick a build
from a normal window, then toggle a floating overlay-v panel on top of the
game with a global shortcut. It reads the same public JSON API the site
serves (`/api/builds`).

## Prerequisites

- **Rust** (stable toolchain) — https://rustup.rs
- **Node 22** and **pnpm** (see the repo root `packageManager` field)
- **Windows only:** MSVC build tools (Visual Studio "Desktop development
  with C++" workload)
- **Windows only:** WebView2 runtime (preinstalled on Windows 11; Windows 10
  needs the Evergreen bootstrapper from Microsoft)

## Run in browser

```bash
pnpm --filter wc3gym-overlay dev
```

Open http://localhost:5173/picker.html. The overlay window (`overlay.html`)
opens in a second tab instead of a real OS window; there is no drag region
or transparency outside of Tauri.

## Run native

```bash
pnpm --filter wc3gym-overlay tauri dev
```

Launches the real picker and overlay-v windows via Tauri.

## Build

```bash
pnpm --filter wc3gym-overlay tauri build
```

Produces a signed/bundled installer for the current platform under
`src-tauri/target/release/bundle/`.

## Check config

```bash
pnpm --filter wc3gym-overlay check:config
```

Validates `tauri.conf.json` and the capability files against the mission's
window, flag, and permission requirements — run it after any config edit.

## Shortcuts

TODO F005

## Install on Windows

TODO F005

## Manual checklist

TODO F005

## Troubleshooting

TODO F005 — SmartScreen warnings on first launch of an unsigned build are
expected until the release workflow (F005) adds code signing.
