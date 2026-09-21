import { NextResponse, type NextRequest } from "next/server";
import { sanityAdminClient } from "@/lib/admin/sanityAdminClient";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large (max 10MB)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const asset = await sanityAdminClient().assets.upload("image", buffer, { filename: file.name });
  return NextResponse.json({ ok: true, assetId: asset._id, url: asset.url });
}
