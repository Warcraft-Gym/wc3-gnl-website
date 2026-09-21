import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionCookieValue,
  isAdminConfigured,
  isLoginThrottled,
  recordLoginAttempt,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/admin/session";

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Admin login is not configured" }, { status: 503 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (isLoginThrottled(ip)) {
    return NextResponse.json({ error: "Too many attempts, try again in a few minutes" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  recordLoginAttempt(ip);

  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
