import "server-only";
import { parseModelsEnv } from "./models";
import type { ChatMessage } from "./provider";

const API_URL = "https://api.openai.com/v1/chat/completions";

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export const OPENAI_MODELS = parseModelsEnv(process.env.OPENAI_MODELS, ["gpt-5.1", "gpt-5.1-mini", "gpt-4o-mini"]);

export async function completeWithOpenAI(model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_completion_tokens: 8192,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error (${res.status}): ${await res.text()}`);
  const json = await res.json();
  // A response cut off mid-article is worse than no response: surface it instead of
  // silently handing back a truncated body that would overwrite the rest of the article.
  if (json.choices?.[0]?.finish_reason === "length") {
    throw new Error("AI response was cut off (hit the output length limit). Try a shorter instruction or edit one section at a time.");
  }
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no text content");
  return text as string;
}
