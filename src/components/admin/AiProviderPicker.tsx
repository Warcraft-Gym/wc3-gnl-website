"use client";

import { useEffect, useState } from "react";

type ProviderInfo = { provider: "anthropic" | "openai"; label: string; models: string[] };

const STORAGE_KEY = "gnl-admin-ai-choice";
const selectClass =
  "h-9 rounded border border-line bg-surface/60 px-2 text-xs text-fg focus:border-gold/60 focus:outline-none";

export function useAiProviders() {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/ai/providers")
      .then((res) => res.json())
      .then((json) => setProviders(json.providers ?? []))
      .catch(() => setProviders([]));
  }, []);

  return providers;
}

export function AiProviderPicker({
  providers,
  provider,
  model,
  onChange,
}: {
  providers: ProviderInfo[];
  provider: string;
  model: string;
  onChange: (provider: string, model: string) => void;
}) {
  useEffect(() => {
    if (providers.length === 0) return;
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { provider: string; model: string } | null;
    const match = providers.find((p) => p.provider === stored?.provider);
    if (match && stored) onChange(stored.provider, match.models.includes(stored.model) ? stored.model : match.models[0]);
    else onChange(providers[0].provider, providers[0].models[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers]);

  const active = providers.find((p) => p.provider === provider);

  const setProvider = (next: string) => {
    const info = providers.find((p) => p.provider === next);
    const nextModel = info?.models[0] ?? "";
    onChange(next, nextModel);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider: next, model: nextModel }));
  };

  const setModel = (next: string) => {
    onChange(provider, next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, model: next }));
  };

  return (
    <div className="flex gap-2">
      <select className={selectClass} value={provider} onChange={(e) => setProvider(e.target.value)}>
        {providers.map((p) => (
          <option key={p.provider} value={p.provider}>
            {p.label}
          </option>
        ))}
      </select>
      <select className={selectClass} value={model} onChange={(e) => setModel(e.target.value)}>
        {active?.models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
