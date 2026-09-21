import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getArticle, publishArticle, updateDraft } from "@/lib/admin/articles";
import { flattenErrors, guideSchema, postSchema } from "@/lib/admin/schemas";

const typeSchema = z.enum(["post", "guide"]);
type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const type = typeSchema.safeParse(req.nextUrl.searchParams.get("type"));
  if (!type.success) return NextResponse.json({ error: "type must be post or guide" }, { status: 400 });

  const article = await getArticle(type.data, id);
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ article });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const type = typeSchema.safeParse(body?.type);
  if (!type.success) return NextResponse.json({ error: "type must be post or guide" }, { status: 400 });

  const schema = type.data === "post" ? postSchema : guideSchema;
  const parsed = schema.partial().safeParse(body?.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fields: flattenErrors(parsed.error) }, { status: 400 });
  }

  const { coverImageRef, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { ...rest };
  if (coverImageRef) patch.coverImage = { _type: "image", asset: { _type: "reference", _ref: coverImageRef } };

  const result = await updateDraft(type.data, id, patch);
  return NextResponse.json({ ok: true, ...result });
}

/** Publish action: POST { type, action: "publish" }. */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const type = typeSchema.safeParse(body?.type);
  if (!type.success) return NextResponse.json({ error: "type must be post or guide" }, { status: 400 });
  if (body?.action !== "publish") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  try {
    const result = await publishArticle(type.data, id);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Nothing to publish — save a draft first." }, { status: 400 });
  }
}
