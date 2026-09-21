import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { improveBody } from "@/lib/admin/ai/actions";
import { isProviderConfigured } from "@/lib/admin/ai/provider";

const bodySchema = z.object({
  provider: z.enum(["anthropic", "openai"]),
  model: z.string().min(1),
  body: z.string().trim().min(1, "Nothing to improve yet"),
  instruction: z.string().trim().min(1, "Describe the change you want"),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { provider, model, body, instruction } = parsed.data;
  if (!isProviderConfigured(provider)) return NextResponse.json({ error: "Provider is not configured" }, { status: 400 });

  try {
    const revised = await improveBody(provider, model, body, instruction);
    return NextResponse.json({ ok: true, body: revised });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI request failed" }, { status: 502 });
  }
}
