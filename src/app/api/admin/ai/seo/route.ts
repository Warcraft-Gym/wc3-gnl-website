import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { suggestSeo } from "@/lib/admin/ai/actions";
import { isProviderConfigured } from "@/lib/admin/ai/provider";

const bodySchema = z.object({
  provider: z.enum(["anthropic", "openai"]),
  model: z.string().min(1),
  title: z.string().trim().min(1, "Add a title first"),
  body: z.string().trim().min(1, "Add some body text first"),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const { provider, model, title, body } = parsed.data;
  if (!isProviderConfigured(provider)) return NextResponse.json({ error: "Provider is not configured" }, { status: 400 });

  try {
    const seo = await suggestSeo(provider, model, title, body);
    return NextResponse.json({ ok: true, seo });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI request failed" }, { status: 502 });
  }
}
