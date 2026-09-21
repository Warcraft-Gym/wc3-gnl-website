import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { chatAboutArticle } from "@/lib/admin/ai/actions";
import { isProviderConfigured } from "@/lib/admin/ai/provider";

const bodySchema = z.object({
  provider: z.enum(["anthropic", "openai"]),
  model: z.string().min(1),
  type: z.enum(["post", "guide"]),
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .min(1)
    .max(40),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { provider, model, type, title, excerpt, body, messages } = parsed.data;
  if (!isProviderConfigured(provider)) return NextResponse.json({ error: "Provider is not configured" }, { status: 400 });

  try {
    const result = await chatAboutArticle(provider, model, type, { title, excerpt, body }, messages);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI request failed" }, { status: 502 });
  }
}
