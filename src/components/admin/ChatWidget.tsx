"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AiProviderPicker, useAiProviders } from "./AiProviderPicker";
import { ChatMarkdown } from "./ChatMarkdown";

const labelClass = "font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted";
const inputClass =
  "h-9 w-full rounded border border-line bg-surface/60 px-2 text-xs text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  type: "post" | "guide";
  title: string;
  excerpt: string;
  body: string;
  onApplyChat: (result: { title?: string; excerpt?: string; body?: string }) => void;
};

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "AI request failed");
  return json;
}

// Fixed-position widget so the admin can keep scrolling/reading the preview while chatting.
export function ChatWidget({ type, title, excerpt, body, onApplyChat }: Props) {
  const providers = useAiProviders();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");

  const [open, setOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<{ title: string; excerpt: string; body: string } | null>(null);
  // A body that comes back much shorter than the current one is more likely a
  // truncated/partial reply than an intentional trim, so hold it for confirmation.
  const [pendingBody, setPendingBody] = useState<string | null>(null);

  if (providers === null || providers.length === 0) return null;

  const isSuspiciousShrink = (nextBody: string) => body.trim().length > 200 && nextBody.trim().length < body.trim().length * 0.6;

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;
    const nextMessages = [...chatMessages, { role: "user" as const, content: text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatBusy(true);
    setChatError(null);
    try {
      const result = await postJson<{ reply: string; title?: string; excerpt?: string; body?: string }>("/api/admin/ai/chat", {
        provider,
        model,
        type,
        title,
        excerpt,
        body,
        messages: nextMessages,
      });
      if (result.title !== undefined || result.excerpt !== undefined) {
        setUndoSnapshot({ title, excerpt, body });
        onApplyChat({ title: result.title, excerpt: result.excerpt });
      }
      if (result.body !== undefined) {
        if (isSuspiciousShrink(result.body)) {
          setPendingBody(result.body);
        } else {
          setUndoSnapshot({ title, excerpt, body });
          onApplyChat({ body: result.body });
        }
      }
      setChatMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setChatBusy(false);
    }
  };

  const undoLastChange = () => {
    if (!undoSnapshot) return;
    onApplyChat(undoSnapshot);
    setUndoSnapshot(null);
  };

  const applyPendingBody = () => {
    if (pendingBody === null) return;
    setUndoSnapshot({ title, excerpt, body });
    onApplyChat({ body: pendingBody });
    setPendingBody(null);
  };


  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        className="fixed bottom-5 right-5 z-50 shadow-lg"
        onClick={() => setOpen(true)}
      >
        Chat with AI
      </Button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-h-[70vh] w-[22rem] flex-col rounded border border-line bg-surface shadow-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-line p-3">
        <p className={labelClass}>Chat</p>
        <div className="flex items-center gap-2">
          <AiProviderPicker providers={providers} provider={provider} model={model} onChange={(p, m) => { setProvider(p); setModel(m); }} />
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>

      {undoSnapshot ? (
        <div className="border-b border-line p-2">
          <Button type="button" variant="ghost" size="sm" onClick={undoLastChange}>
            Undo last AI change
          </Button>
        </div>
      ) : null}

      {pendingBody !== null ? (
        <div className="space-y-2 border-b border-line p-3">
          <p className="text-xs text-loss">
            The suggested body is much shorter than the current one ({pendingBody.trim().length} vs {body.trim().length} characters)
            {" \u2014 it may have been cut off. Review before applying."}
          </p>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-surface-2/70 p-2 text-xs text-faint">{pendingBody}</pre>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={applyPendingBody}>
              Apply anyway
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPendingBody(null)}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}


      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {chatMessages.length === 0 ? (
          <p className="text-xs text-faint">Ask the agent to change the title, excerpt, or body while you keep browsing the page.</p>
        ) : (
          chatMessages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              {m.role === "user" ? (
                <p className="inline-block rounded bg-gold/20 px-2 py-1 text-xs text-fg">{m.content}</p>
              ) : (
                <div className="inline-block rounded bg-surface-2/70 px-2 py-1 text-xs text-fg">
                  <ChatMarkdown text={m.content} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {chatError ? <p className="px-3 text-xs text-loss">{chatError}</p> : null}

      <div className="flex gap-2 border-t border-line p-3">
        <input
          className={inputClass}
          placeholder="Ask the agent to change something…"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void sendChatMessage();
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={chatBusy || !chatInput.trim()} onClick={() => void sendChatMessage()}>
          {chatBusy ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
