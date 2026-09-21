import "server-only";
import { parseModelsEnv } from "./models";
import type { ChatMessage } from "./provider";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const ANTHROPIC_MODELS = parseModelsEnv(process.env.ANTHROPIC_MODELS, [
  "claude-sonnet-4-5-20250929",
  "claude-3-5-haiku-20241022",
]);

export async function completeWithAnthropic(model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": API_VERSION },
    body: JSON.stringify({ model, max_tokens: 8192, system, messages }),
  });

  if (!res.ok) throw new Error(`Anthropic API error (${res.status}): ${await res.text()}`);
  const json = await res.json();
  // A response cut off mid-article is worse than no response: surface it instead of
  // silently handing back a truncated body that would overwrite the rest of the article.
  if (json.stop_reason === "max_tokens") {
    throw new Error("AI response was cut off (hit the output length limit). Try a shorter instruction or edit one section at a time.");
  }
  const text = json.content?.find((block: { type: string }) => block.type === "text")?.text;
  if (!text) throw new Error("Anthropic returned no text content");
  return text as string;
}
