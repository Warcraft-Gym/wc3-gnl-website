# Warcraft 3 Gym desktop overlay

The desktop overlay is a Tauri v2 app that floats a build order in a
transparent, always-on-top window while you play: pick a build from a
normal window, then toggle a floating panel on top of the game with a
global shortcut. It reads the same public JSON API the site serves
(`/api/builds`).

It moved out of this repo and now lives at
**[`Warcraft-Gym/wc3-gym-overlay`](https://github.com/Warcraft-Gym/wc3-gym-overlay)** —
source, [releases](https://github.com/Warcraft-Gym/wc3-gym-overlay/releases)
and docs (install steps, shortcuts, the release process, the manual
checklist) all live there now.

On this site, `/tools/overlay` is the download page: it reads the new
repo's latest GitHub Release (`src/lib/overlay.ts`) and links the Windows
installer, Windows portable and macOS builds straight from there.

## The update bridge

Every overlay install up to and including 0.4.2 was published from *this*
repo and checks *this* repo's `releases/latest/download/latest.json` to
learn about updates. That file still lives on this repo's last
`overlay-v0.4.2` release, and its `latest.json` now points those old
installs at 0.5.0 on the new repo — one hop, then every install that takes
it is fully on `Warcraft-Gym/wc3-gym-overlay` for every release after.
**Never publish another `overlay-v*` release on this repo.** GitHub Releases
resolves `releases/latest` to the most recently published non-draft,
non-prerelease tag, so a new `overlay-v*` release here would replace the
0.4.2 bridge as "Latest" and break the handover for anyone who hasn't
updated yet.
