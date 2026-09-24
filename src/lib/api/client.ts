import "server-only";

/**
 * Server-only HTTP client for the Warcraft-Gym FastAPI backend.
 *
 * The public site fetches league data through Next.js Server Components. Every
 * read is an open route sent with no Authorization header, so the backend's edge
 * cache can answer it without a database read. When the API is not configured
 * (local dev, previews without secrets) or a request fails, callers fall back to
 * bundled fixtures, the site always renders.
 *
 * Env:
 *   GNL_API_BASE_URL   backend API base URL
 */

const BASE_URL = process.env.GNL_API_BASE_URL?.replace(/\/$/, "");

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

  // Retry transient failures (network errors, 5xx), the backend is serverless
  // and can cold-start, especially under a burst of build/render fetches.
  const MAX_ATTEMPTS = 3;
  let lastError: ApiError = new ApiError(`Request failed for ${path}`, undefined, path);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers, next: { revalidate } });
      if (res.ok) return (await res.json()) as T;
      lastError = new ApiError(`API ${res.status} for ${path}`, res.status, path);
      if (res.status < 500) throw lastError; // client errors won't fix on retry
    } catch (cause) {
      if (cause instanceof ApiError && cause.status && cause.status < 500) throw cause;
      lastError = new ApiError(
        `Network error calling ${path}: ${(cause as Error).message}`,
        undefined,
        path,
      );
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  throw lastError;
}

/** The backend's largest page for a list route. */
const PAGE_SIZE = 500;

/** Every row of a paged list route, one page of PAGE_SIZE at a time. */
export async function apiGetAll<T>(path: string, options: GetOptions = {}): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await apiGet<T[]>(path, {
      ...options,
      query: { ...options.query, limit: PAGE_SIZE, offset },
    });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
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
    console.warn(`[gnl] ${label}: falling back to fixtures -`, String(err));
    return { data: fallback(), source: "fixture" };
  }
}
