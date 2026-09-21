"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AiProviderPicker, useAiProviders } from "./AiProviderPicker";

const labelClass = "font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted";
const inputClass =
  "h-9 w-full rounded border border-line bg-surface/60 px-2 text-xs text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";
const textareaClass =
  "w-full rounded border border-line bg-surface/60 px-2 py-1.5 font-mono text-xs text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";

type Props = {
  type: "post" | "guide";
  title: string;
  body: string;
  onApplyDraft: (result: { title: string; excerpt: string; body: string }) => void;
  onApplyBody: (body: string) => void;
  onApplySeo: (result: { title: string; excerpt: string }) => void;
};

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "AI request failed");
  return json;
}

export function AiAssistPanel({ type, title, body, onApplyDraft, onApplyBody, onApplySeo }: Props) {
  const providers = useAiProviders();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");

  const [topic, setTopic] = useState("");
  const [instruction, setInstruction] = useState("");
  const [pendingDraft, setPendingDraft] = useState<{ title: string; excerpt: string; body: string } | null>(null);
  const [pendingBody, setPendingBody] = useState<string | null>(null);
  const [pendingSeo, setPendingSeo] = useState<{ title: string; excerpt: string } | null>(null);
  const [busy, setBusy] = useState<"draft" | "improve" | "seo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (providers === null) return null;
  if (providers.length === 0) {
    return (
      <p className="rounded border border-line bg-surface/30 p-3 text-xs text-faint">
        AI assist is off — set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable it.
      </p>
    );
  }

  const run = async (action: "draft" | "improve" | "seo", fn: () => Promise<void>) => {
    setBusy(action);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5 rounded border border-line bg-surface/30 p-4">
      <div className="flex items-center justify-between">
        <p className={labelClass}>AI assist</p>
        <AiProviderPicker providers={providers} provider={provider} model={model} onChange={(p, m) => { setProvider(p); setModel(m); }} />
      </div>

      {error ? <p className="text-xs text-loss">{error}</p> : null}

      <div className="space-y-2">
        <p className={labelClass}>Generate a draft</p>
        <textarea
          rows={2}
          className={textareaClass}
          placeholder="What should this be about?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null || !topic.trim()}
          onClick={() =>
            run("draft", async () => {
              const { draft } = await postJson<{ draft: { title: string; excerpt: string; body: string } }>("/api/admin/ai/draft", {
                provider,
                model,
                type,
                topic,
              });
              setPendingDraft(draft);
            })
          }
        >
          {busy === "draft" ? "Generating…" : "Generate draft"}
        </Button>
        {pendingDraft ? (
          <div className="space-y-2 rounded border border-gold/30 bg-bg/40 p-3">
            <p className="text-sm font-bold text-fg">{pendingDraft.title}</p>
            <p className="text-xs text-muted">{pendingDraft.excerpt}</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-faint">{pendingDraft.body}</pre>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => { onApplyDraft(pendingDraft); setPendingDraft(null); }}>
                Accept
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPendingDraft(null)}>
                Discard
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className={labelClass}>Improve the body</p>
        <input
          className={inputClass}
          placeholder="e.g. simplify, fix grammar, shorten"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null || !instruction.trim() || !body.trim()}
          onClick={() =>
            run("improve", async () => {
              const result = await postJson<{ body: string }>("/api/admin/ai/improve", { provider, model, body, instruction });
              setPendingBody(result.body);
            })
          }
        >
          {busy === "improve" ? "Rewriting…" : "Rewrite body"}
        </Button>
        {pendingBody ? (
          <div className="space-y-2 rounded border border-gold/30 bg-bg/40 p-3">
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-faint">{pendingBody}</pre>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => { onApplyBody(pendingBody); setPendingBody(null); }}>
                Accept
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPendingBody(null)}>
                Discard
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className={labelClass}>Suggest SEO title &amp; excerpt</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null || !title.trim() || !body.trim()}
          onClick={() =>
            run("seo", async () => {
              const { seo } = await postJson<{ seo: { title: string; excerpt: string } }>("/api/admin/ai/seo", { provider, model, title, body });
              setPendingSeo(seo);
            })
          }
        >
          {busy === "seo" ? "Thinking…" : "Suggest SEO"}
        </Button>
        {pendingSeo ? (
          <div className="space-y-2 rounded border border-gold/30 bg-bg/40 p-3">
            <p className="text-sm font-bold text-fg">{pendingSeo.title}</p>
            <p className="text-xs text-muted">{pendingSeo.excerpt}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => { onApplySeo(pendingSeo); setPendingSeo(null); }}>
                Accept
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPendingSeo(null)}>
                Discard
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
