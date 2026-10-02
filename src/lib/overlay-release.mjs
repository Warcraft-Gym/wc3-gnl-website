/** Pure selection logic for `getOverlayRelease` (`overlay.ts`), pulled out
 *  so `node --test` can run it with no loader: `overlay.ts` starts with
 *  `import "server-only"`, which throws outside a server component render.
 *
 * Picks the newest `overlay-v*` release that is neither a draft nor a
 * pre-release, then builds the version string and the download links from
 * its assets. A GitHub pre-release beta used to publish before the stable
 * release it is a beta of must never be the one shown here.
 */

/** @param {{ tag_name: string, html_url: string, published_at: string, draft: boolean, prerelease: boolean, assets: { name: string, browser_download_url: string }[] }[]} releases
 *  @param {string} repo */
export function selectOverlayRelease(releases, repo) {
  if (!Array.isArray(releases)) return null;
  const latest = releases.find((r) => !r.draft && !r.prerelease && r.tag_name.startsWith("overlay-v"));
  if (!latest) return null;

  const names = new Set(latest.assets.map((a) => a.name));
  const asset = (stable, test) =>
    names.has(stable)
      ? `https://github.com/${repo}/releases/latest/download/${stable}`
      : latest.assets.find((a) => test(a.name))?.browser_download_url;

  return {
    version: latest.tag_name.replace(/^overlay-v/, ""),
    url: latest.html_url,
    publishedAt: latest.published_at,
    windowsInstaller: asset("Warcraft-3-Gym-Overlay-Setup.exe", (n) => n.endsWith("-setup.exe")),
    windowsPortable: asset("Warcraft-3-Gym-Overlay-Portable.exe", (n) => n.endsWith("_portable.exe")),
    macDmg: asset("Warcraft-3-Gym-Overlay.dmg", (n) => n.endsWith(".dmg")),
  };
}
