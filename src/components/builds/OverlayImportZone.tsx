"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ClipboardPaste, FileUp, MonitorPlay, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type ImportMessage = { tone: "ok" | "error"; text: string };

/**
 * The "bring it over from the overlay app" panel on the submit form. One
 * drop zone that takes the exported `.wc3gym.json` any way the user has it:
 * dragged in, picked from a file dialog, or pasted (button or Ctrl+V while
 * the zone is focused). The form owns parsing; this only hands over text.
 */
export function OverlayImportZone({
  onJson,
  message,
  onReset,
}: {
  onJson: (json: string) => void;
  message: ImportMessage | null;
  /** Clears the imported state so another file can be loaded. */
  onReset: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const imported = message?.tone === "ok";

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      onJson(await f.text());
    } finally {
      setBusy(false);
    }
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    await readFile(f);
  };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) return readFile(f);
    const text = e.dataTransfer.getData("text/plain");
    if (text) onJson(text);
  };
  const onPasteEvent = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text.trim()) return;
    e.preventDefault();
    onJson(text);
  };
  const onPasteButton = async () => {
    try {
      onJson(await navigator.clipboard.readText());
    } catch {
      // Clipboard permission denied: the zone still accepts Ctrl+V.
      onJson("");
    }
  };

  return (
    <section
      aria-label="Import from the overlay app"
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onPaste={onPasteEvent}
      tabIndex={0}
      className={cn(
        "relative rounded border border-dashed p-4 outline-none transition-colors sm:p-5",
        "focus-visible:border-arcane focus-visible:ring-2 focus-visible:ring-arcane/40",
        dragging
          ? "border-arcane bg-arcane/15"
          : imported
            ? "border-win/50 bg-win/5"
            : "border-arcane/50 bg-arcane/5 hover:border-arcane/80",
      )}
    >
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          aria-hidden
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-lg border",
            imported ? "border-win/40 bg-win/10 text-win" : "border-arcane/40 bg-arcane/10 text-arcane",
          )}
        >
          {imported ? <CheckCircle2 size={22} /> : <MonitorPlay size={22} />}
        </span>

        <div className="min-w-0 flex-1">
          {imported ? (
            <>
              <p className="font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-fg">Build imported</p>
              <p role="status" className="mt-0.5 text-sm text-muted">
                {message.text}
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-fg">
                Made it in the overlay app?
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Drop the exported <span className="font-mono text-xs text-fg">.wc3gym.json</span> here, pick the file, or paste its contents. Every field and step fills in for you.
              </p>
              {message?.tone === "error" ? (
                <p role="alert" className="mt-1.5 text-sm text-loss">
                  {message.text}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {imported ? (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw size={14} /> Import another
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
                <FileUp size={14} /> Choose file
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onPasteButton}>
                <ClipboardPaste size={14} /> Paste
              </Button>
            </>
          )}
        </div>
      </div>

      {imported ? null : (
        <p className="mt-3 text-[0.72rem] text-faint">
          In the app, open the private build and use <span className="text-muted">Export</span>, or <span className="text-muted">Submit to site</span> to land here with it already loaded.
        </p>
      )}

      {dragging ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 grid place-items-center rounded bg-bg/80 font-display text-sm font-bold uppercase tracking-[0.12em] text-arcane"
        >
          Drop to import
        </span>
      ) : null}
    </section>
  );
}
