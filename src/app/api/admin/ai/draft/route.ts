import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { draftArticle } from "@/lib/admin/ai/actions";
import { isProviderConfigured } from "@/lib/admin/ai/provider";

const bodySchema = z.object({
  provider: z.enum(["anthropic", "openai"]),
  model: z.string().min(1),
  type: z.enum(["post", "guide"]),
  topic: z.string().trim().min(1, "Describe what the draft should be about"),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { provider, model, type, topic } = parsed.data;
  if (!isProviderConfigured(provider)) return NextResponse.json({ error: "Provider is not configured" }, { status: 400 });

  try {
    const draft = await draftArticle(provider, model, type, topic);
    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI request failed" }, { status: 502 });
  }
}
