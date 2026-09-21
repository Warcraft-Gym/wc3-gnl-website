import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createDraft, listArticles, type ArticleType } from "@/lib/admin/articles";
import { flattenErrors, guideSchema, postSchema } from "@/lib/admin/schemas";

const typeSchema = z.enum(["post", "guide"]);

export async function GET(req: NextRequest) {
  const type = typeSchema.safeParse(req.nextUrl.searchParams.get("type"));
  if (!type.success) return NextResponse.json({ error: "type must be post or guide" }, { status: 400 });

  const articles = await listArticles(type.data);
  return NextResponse.json({ articles });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const type = typeSchema.safeParse(body?.type);
  if (!type.success) return NextResponse.json({ error: "type must be post or guide" }, { status: 400 });

  const schema = type.data === "post" ? postSchema : guideSchema;
  const parsed = schema.safeParse(body?.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fields: flattenErrors(parsed.error) }, { status: 400 });
  }

  const { coverImageRef, ...rest } = parsed.data;
  const doc = coverImageRef
    ? { ...rest, coverImage: { _type: "image", asset: { _type: "reference", _ref: coverImageRef } } }
    : rest;

  const result = await createDraft(type.data as ArticleType, doc);
  return NextResponse.json({ ok: true, ...result });
}
