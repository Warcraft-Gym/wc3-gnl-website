import { NextResponse, type NextRequest } from "next/server";
import { isAdminConfigured, isSessionValid, SESSION_COOKIE } from "@/lib/admin/session";

/**
 * Gate for the admin CMS. Proxy runs on the Node.js runtime by default in
 * this Next.js version, so the same HMAC check used by the login route works
 * here unchanged (see docs/app/api-reference/file-conventions/proxy).
 *
 * Defense in depth: each admin API route/server function also re-checks the
 * session itself rather than trusting Proxy alone (see /docs guide on Proxy
 * + Data Security) — a matcher change here shouldn't silently open a route.
 */

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/auth/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const authed = isAdminConfigured() && isSessionValid(request.cookies.get(SESSION_COOKIE)?.value);
  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
