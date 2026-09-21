import "server-only";
import { ANTHROPIC_MODELS, completeWithAnthropic, isAnthropicConfigured } from "./anthropic";
import { completeWithOpenAI, isOpenAIConfigured, OPENAI_MODELS } from "./openai";

export type AiProvider = "anthropic" | "openai";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ProviderInfo = { provider: AiProvider; label: string; models: string[] };

/** Only providers whose API key is set are offered in the picker. */
export function listAvailableProviders(): ProviderInfo[] {
  const providers: ProviderInfo[] = [];
  if (isAnthropicConfigured()) providers.push({ provider: "anthropic", label: "Claude", models: ANTHROPIC_MODELS });
  if (isOpenAIConfigured()) providers.push({ provider: "openai", label: "ChatGPT", models: OPENAI_MODELS });
  return providers;
}

export function isProviderConfigured(provider: AiProvider): boolean {
  return provider === "anthropic" ? isAnthropicConfigured() : isOpenAIConfigured();
}

export async function complete(provider: AiProvider, model: string, system: string, messages: ChatMessage[]): Promise<string> {
  return provider === "anthropic" ? completeWithAnthropic(model, system, messages) : completeWithOpenAI(model, system, messages);
}
