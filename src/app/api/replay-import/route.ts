import { NextResponse } from "next/server";
import { importReplayFile, importW3ChampionsMatch, MAX_REPLAY_BYTES } from "@/lib/builds/replay-import";
import { replayCorsHeaders } from "@/lib/replay-cors.mjs";

/**
 * Turns a replay into build-order drafts for the submit form. POST either
 * multipart form data with a `replay` file (.w3g) or JSON `{ match }` with
 * a W3Champions match link or id. Used same-origin by the submit page, and
 * cross-origin by the desktop overlay (see `replayCorsHeaders` for its
 * allowlisted origins); nothing is stored.
 */

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: replayCorsHeaders(origin) });
}

export async function POST(request: Request) {
  const cors = replayCorsHeaders(request.headers.get("origin"));

  try {
    const type = request.headers.get("content-type") ?? "";
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_REPLAY_BYTES + 4096) {
      return NextResponse.json({ error: "That replay is too large (8 MB max)." }, { status: 413, headers: cors });
    }

    let result;
    if (type.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("replay");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Attach a .w3g replay file." }, { status: 400, headers: cors });
      }
      const dropLikelyRejected = form.get("dropLikelyRejected") !== "false";
      result = await importReplayFile(file, { dropLikelyRejected });
    } else {
      const body = (await request.json().catch(() => null)) as { match?: unknown; dropLikelyRejected?: unknown } | null;
      if (typeof body?.match !== "string") {
        return NextResponse.json({ error: "Send { match: <W3Champions link or id> }." }, { status: 400, headers: cors });
      }
      const dropLikelyRejected = body.dropLikelyRejected !== false;
      result = await importW3ChampionsMatch(body.match, { dropLikelyRejected });
    }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: cors });
    return NextResponse.json(result.replay, {
      status: 200,
      headers: { ...cors, "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Could not read that request." }, { status: 400, headers: cors });
  }
}
