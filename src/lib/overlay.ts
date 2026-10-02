import "server-only";
import * as impl from "./overlay-release.mjs";

/**
 * Latest desktop overlay release, read from the public GitHub Releases API
 * (no token needed at this volume). Releases are tagged `overlay-v<semver>`,
 * so the newest such tag wins even if other kinds of release appear later.
 * Drafts and pre-releases are both skipped, so a beta published ahead of the
 * stable release it belongs to never shows here. Selection logic lives in
 * `overlay-release.mjs`, which has no `server-only` import so `node --test`
 * can exercise it directly.
 * Cached for ten minutes; on any failure the section still renders with a link
 * to the releases page.
 */

const REPO = "Warcraft-Gym/wc3-gym-overlay";
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
  prerelease: boolean;
  assets: { name: string; browser_download_url: string }[];
};

const selectOverlayRelease = impl.selectOverlayRelease as (
  releases: GhRelease[],
  repo: string,
) => OverlayRelease | null;

export async function getOverlayRelease(): Promise<OverlayRelease | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, {
      headers: { accept: "application/vnd.github+json" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const releases = (await res.json()) as GhRelease[];
    return selectOverlayRelease(releases, REPO);
  } catch {
    return null;
  }
}
