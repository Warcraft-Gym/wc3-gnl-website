import "server-only";

/**
 * Server-only HTTP client for the Warcraft-Gym Flask backend.
 *
 * The public site fetches league data through Next.js Server Components, so the
 * service credential never reaches the browser. When the API is not configured
 * (local dev, previews without secrets) or a request fails, callers fall back to
 * bundled fixtures — the site always renders.
 *
 * Env:
 *   GNL_API_BASE_URL   e.g. https://api.warcraft3.gym  (Flask, CORS-open)
 *   GNL_SERVICE_TOKEN  JWT for read access to admin-scoped read endpoints
 */

const BASE_URL = process.env.GNL_API_BASE_URL?.replace(/\/$/, "");
const SERVICE_TOKEN = process.env.GNL_SERVICE_TOKEN;

/** Default cache window for public league data (seconds). */
const DEFAULT_REVALIDATE = 60;

export function isApiConfigured(): boolean {
  return Boolean(BASE_URL);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly path?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type GetOptions = {
  revalidate?: number;
  /** Extra query params. */
  query?: Record<string, string | number | undefined>;
};

export async function apiGet<T = unknown>(
  path: string,
  { revalidate = DEFAULT_REVALIDATE, query }: GetOptions = {},
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError("GNL_API_BASE_URL not configured", undefined, path);
  }

  const url = new URL(path.replace(/^\//, ""), BASE_URL + "/");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (SERVICE_TOKEN) headers.Authorization = `Bearer ${SERVICE_TOKEN}`;

  let res: Response;
  try {
    res = await fetch(url, { headers, next: { revalidate } });
  } catch (cause) {
    throw new ApiError(
      `Network error calling ${path}: ${(cause as Error).message}`,
      undefined,
      path,
    );
  }

  if (!res.ok) {
    throw new ApiError(`API ${res.status} for ${path}`, res.status, path);
  }

  return (await res.json()) as T;
}

/**
 * Try a live fetch; on any failure (or when unconfigured) resolve the fallback.
 * Keeps the fixture wiring in one place and logs the reason server-side only.
 */
export async function withFallback<T>(
  live: () => Promise<T>,
  fallback: () => T,
  label: string,
): Promise<{ data: T; source: "live" | "fixture" }> {
  if (!isApiConfigured()) {
    return { data: fallback(), source: "fixture" };
  }
  try {
    return { data: await live(), source: "live" };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[gnl] ${label}: falling back to fixtures —`, String(err));
    }
    return { data: fallback(), source: "fixture" };
  }
}
