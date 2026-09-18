import "server-only";

/**
 * Latest desktop overlay release, read from the public GitHub Releases API
 * (no token needed at this volume). Releases are tagged `overlay-v<semver>`,
 * so the newest such tag wins even if other kinds of release appear later.
 * Cached for an hour; on any failure the section still renders with a link
 * to the releases page.
 */

const REPO = "Warcraft-Gym/wc3-gnl-website";
export const OVERLAY_RELEASES_URL = `https://github.com/${REPO}/releases`;
export const OVERLAY_DOCS_URL = `https://github.com/${REPO}/blob/main/docs/overlay.md`;

export type OverlayRelease = {
  version: string;
  url: string;
  publishedAt: string;
  windowsInstaller?: string;
  windowsPortable?: string;
  macDmg?: string;
};

type GhRelease = {
  tag_name: string;
  html_url: string;
  published_at: string;
  draft: boolean;
  assets: { name: string; browser_download_url: string }[];
};

export async function getOverlayRelease(): Promise<OverlayRelease | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, {
      headers: { accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const releases = (await res.json()) as GhRelease[];
    const latest = releases.find((r) => !r.draft && r.tag_name.startsWith("overlay-v"));
    if (!latest) return null;
    const asset = (test: (name: string) => boolean) =>
      latest.assets.find((a) => test(a.name))?.browser_download_url;
    return {
      version: latest.tag_name.replace(/^overlay-v/, ""),
      url: latest.html_url,
      publishedAt: latest.published_at,
      windowsInstaller: asset((n) => n.endsWith("-setup.exe")),
      windowsPortable: asset((n) => n.endsWith("_portable.exe")),
      macDmg: asset((n) => n.endsWith(".dmg")),
    };
  } catch {
    return null;
  }
}
