import { NextResponse } from "next/server";
import { importReplayFile, importW3ChampionsMatch, MAX_REPLAY_BYTES } from "@/lib/builds/replay-import";
import { parseReplayImportOptions } from "@/lib/builds/replay-import-options";
import { replayCorsHeaders } from "@/lib/replay-cors.mjs";

/**
 * Turns a replay into build-order drafts for the submit form. POST either
 * multipart form data with a `replay` file (.w3g) or JSON `{ match }` with
 * a W3Champions match link or id. Used same-origin by the submit page, and
 * cross-origin by the desktop overlay (see `replayCorsHeaders` for its
 * allowlisted origins); nothing is stored.
 *
 * Both request shapes accept the same optional fields (multipart as form
 * field strings, JSON as native types; see `parseReplayImportOptions`):
 * `dropLikelyRejected` (default on), `cutoffSeconds` (integer, 1-3600,
 * default 480), `includeUpgrades` (default on) and `includeItems` (default
 * off). Any field left out keeps `extractBuild`'s own default; an invalid
 * value gets a 400.
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
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return NextResponse.json({ error: "Could not read that request." }, { status: 400, headers: cors });
      }
      const file = form.get("replay");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Attach a .w3g replay file." }, { status: 400, headers: cors });
      }
      const dropLikelyRejected = form.get("dropLikelyRejected") !== "false";
      const parsed = parseReplayImportOptions({
        cutoffSeconds: form.get("cutoffSeconds") ?? undefined,
        includeUpgrades: form.get("includeUpgrades") ?? undefined,
        includeItems: form.get("includeItems") ?? undefined,
      });
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: cors });
      result = await importReplayFile(file, { dropLikelyRejected, ...parsed.options });
    } else {
      const body = (await request.json().catch(() => null)) as {
        match?: unknown;
        dropLikelyRejected?: unknown;
        cutoffSeconds?: unknown;
        includeUpgrades?: unknown;
        includeItems?: unknown;
      } | null;
      if (typeof body?.match !== "string") {
        return NextResponse.json({ error: "Send { match: <W3Champions link or id> }." }, { status: 400, headers: cors });
      }
      const dropLikelyRejected = body.dropLikelyRejected !== false;
      const parsed = parseReplayImportOptions({
        cutoffSeconds: body.cutoffSeconds,
        includeUpgrades: body.includeUpgrades,
        includeItems: body.includeItems,
      });
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: cors });
      result = await importW3ChampionsMatch(body.match, { dropLikelyRejected, ...parsed.options });
    }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status, headers: cors });
    return NextResponse.json(result.replay, {
      status: 200,
      headers: { ...cors, "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[replay-import] unexpected error", err);
    return NextResponse.json(
      { error: "Something went wrong importing that replay. Please try again." },
      { status: 500, headers: cors },
    );
  }
}
