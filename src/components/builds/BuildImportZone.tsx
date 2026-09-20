"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ClipboardPaste, FileUp, Loader2, RotateCcw, Swords } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { W3cMark } from "@/components/ui/W3cMark";
import { parseExchange, type ExchangeBuild } from "@/lib/builds/exchange";
import type { ReplayImport, ReplayImportPlayer } from "@/lib/builds/replay-import";
import { cn } from "@/lib/utils";

export type ImportMessage = { tone: "ok" | "error"; text: string };

type Phase =
  | { kind: "idle" }
  | { kind: "busy"; label: string }
  | { kind: "pick"; replay: ReplayImport }
  | { kind: "done" };

const input =
  "h-10 w-full rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-arcane/70 focus:outline-none";

const W3C_MATCH = /w3champions\.com\/match\/[0-9a-f]{24}|^[0-9a-f]{24}$/i;

/**
 * The "start from something you already have" panel on the submit form.
 * One drop zone that fills the form from a Warcraft III replay (.w3g), a
 * W3Champions match link (the replay is fetched from their API) or the
 * overlay app's export (.wc3gym.json), by drag and drop, file dialog, the
 * text field or a plain paste. Replays are read on the server through
 * /api/replay-import; when a replay has several players the zone asks
 * whose build to take. The form owns what happens with the build.
 */
export function BuildImportZone({
  onImport,
  message,
  onReset,
}: {
  onImport: (build: ExchangeBuild) => void;
  /** The form's verdict after onImport, or an error it wants shown. */
  message: ImportMessage | null;
  onReset: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [dropLikelyRejected, setDropLikelyRejected] = useState(true);
  // The replay source behind the current/last import, kept so toggling the
  // filter checkbox can re-run the same request. `null` for a JSON/overlay
  // import (the filter does not apply there) or before anything was tried.
  const [source, setSource] = useState<{ kind: "file"; file: File } | { kind: "match"; ref: string } | null>(null);
  // Set only for a single-player replay (the picker shows counts itself),
  // so the "done" view can report what came in alongside the form's message.
  const [singleStats, setSingleStats] = useState<{ steps: number; dropped: number } | null>(null);
  const done = message?.tone === "ok";
  const shownError = error ?? (message?.tone === "error" ? message.text : null);

  const fail = (msg: string) => {
    setError(msg);
    setPhase({ kind: "idle" });
  };
  const finish = (build: ExchangeBuild) => {
    setError(null);
    onImport(build);
    setPhase({ kind: "done" });
  };
  const reset = () => {
    setError(null);
    setText("");
    setSource(null);
    setSingleStats(null);
    setPhase({ kind: "idle" });
    onReset();
  };

  const takeReplay = (replay: ReplayImport) => {
    // A Computer player's orders are not in the replay, so it has no steps
    // to offer; only players with a build are worth picking from.
    const players = replay.players.filter((p) => p.build.steps.length > 0);
    if (!players.length) return fail("No build orders were found in this replay.");
    if (players.length === 1) {
      const p = players[0];
      setSingleStats({ steps: p.build.steps.length, dropped: p.dropped });
      finish(p.build);
    } else {
      setSingleStats(null);
      setPhase({ kind: "pick", replay: { ...replay, players } });
    }
  };

  const importJson = (json: string) => {
    const r = parseExchange(json);
    if (r.ok) finish(r.build);
    else fail(r.error);
  };

  const request = async (label: string, init: RequestInit) => {
    setError(null);
    setPhase({ kind: "busy", label });
    try {
      const res = await fetch("/api/replay-import", init);
      const body = (await res.json().catch(() => null)) as (ReplayImport & { error?: string }) | null;
      if (!res.ok || !body || body.error) return fail(body?.error ?? "The replay could not be read.");
      takeReplay(body);
    } catch {
      fail("The replay could not be sent. Check your connection and try again.");
    }
  };

  const importReplayFile = (file: File, drop: boolean) => {
    const form = new FormData();
    form.append("replay", file);
    form.append("dropLikelyRejected", String(drop));
    return request("Reading the replay", { method: "POST", body: form });
  };
  const importMatch = (ref: string, drop: boolean) =>
    request("Fetching the replay from W3Champions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ match: ref, dropLikelyRejected: drop }),
    });

  /** A file of either kind, from the dialog or a drop. */
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".w3g")) {
      setSource({ kind: "file", file });
      return importReplayFile(file, dropLikelyRejected);
    }
    if (name.endsWith(".json")) {
      setSource(null);
      return importJson(await file.text());
    }
    // Unknown extension: sniff the replay header, else treat it as text.
    const head = new Uint8Array(await file.slice(0, 26).arrayBuffer());
    if (String.fromCharCode(...head) === "Warcraft III recorded game") {
      setSource({ kind: "file", file });
      return importReplayFile(file, dropLikelyRejected);
    }
    setSource(null);
    importJson(await file.text());
  };

  /** Pasted or typed text: a match link, or the exported JSON. */
  const importText = (raw: string) => {
    const value = raw.trim();
    if (!value) return fail("Paste a W3Champions match link or the exported JSON first.");
    if (W3C_MATCH.test(value)) {
      setSource({ kind: "match", ref: value });
      return importMatch(value, dropLikelyRejected);
    }
    if (value.startsWith("{")) {
      setSource(null);
      return importJson(value);
    }
    fail("That is neither a W3Champions match link nor an exported build.");
  };

  /** The filter checkbox: re-runs the last replay request so counts stay in
   *  sync, or just records the flag when nothing has been imported yet. */
  const onToggleDrop = (checked: boolean) => {
    setDropLikelyRejected(checked);
    if (!source) return;
    if (source.kind === "file") void importReplayFile(source.file, checked);
    else void importMatch(source.ref, checked);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) return importFile(f);
    const t = e.dataTransfer.getData("text/plain");
    if (t) importText(t);
  };
  const onPasteEvent = (e: React.ClipboardEvent) => {
    // Let the text field take its own paste; catch pastes anywhere else.
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const t = e.clipboardData.getData("text/plain");
    if (!t.trim()) return;
    e.preventDefault();
    importText(t);
  };
  const onPasteButton = async () => {
    try {
      importText(await navigator.clipboard.readText());
    } catch {
      fail("Could not read the clipboard. Paste into the field instead.");
    }
  };

  const busy = phase.kind === "busy";

  // Sent with every replay request (file or link); re-runs the last one on
  // toggle so the "N dropped" counts stay accurate. Not shown for the
  // overlay's own JSON export — that build is already final.
  const dropToggle = (
    <label className="mt-3 flex items-center gap-2 text-xs text-muted">
      <input
        type="checkbox"
        checked={dropLikelyRejected}
        disabled={busy}
        onChange={(e) => onToggleDrop(e.target.checked)}
        className="size-3.5 rounded border-line accent-arcane"
      />
      Drop orders the game likely rejected
    </label>
  );

  return (
    <section
      aria-label="Start from a replay or the overlay app"
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
          : done
            ? "border-win/50 bg-win/5"
            : "border-arcane/50 bg-arcane/5 hover:border-arcane/80",
      )}
    >
      <input
        ref={fileInput}
        type="file"
        accept=".w3g,.json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void importFile(f);
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          aria-hidden
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-lg border",
            done ? "border-win/40 bg-win/10 text-win" : "border-arcane/40 bg-arcane/10 text-arcane",
          )}
        >
          {done ? <CheckCircle2 size={22} /> : busy ? <Loader2 size={22} className="animate-spin" /> : <Swords size={22} />}
        </span>

        <div className="min-w-0 flex-1">
          {done ? (
            <>
              <p className="font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-fg">Build imported</p>
              <p role="status" className="mt-0.5 text-sm text-muted">
                {message?.text}
              </p>
              {singleStats ? (
                <p role="status" className="tnum mt-0.5 text-xs text-faint">
                  {singleStats.dropped > 0
                    ? `Imported ${singleStats.steps} steps · ${singleStats.dropped} dropped`
                    : `Imported ${singleStats.steps} steps`}
                </p>
              ) : null}
              {dropToggle}
            </>
          ) : phase.kind === "pick" ? (
            <>
              <PlayerPicker replay={phase.replay} onPick={(p) => finish(p.build)} />
              {dropToggle}
            </>
          ) : (
            <>
              <p className="font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-fg">
                Start from a replay or the overlay app
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Drop a replay (<span className="font-mono text-xs text-fg">.w3g</span>), paste a W3Champions match link, or load an overlay export (<span className="font-mono text-xs text-fg">.wc3gym.json</span>). The steps and fields fill in for you.
              </p>
              {/* Not a <form>: the zone lives inside the submit form, and
                  forms cannot nest. Enter in the field imports. */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="import-text">
                  W3Champions match link or exported JSON
                </label>
                <input
                  id="import-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    importText(text);
                  }}
                  placeholder="https://w3champions.com/match/…  or paste the exported JSON"
                  disabled={busy}
                  className={input}
                />
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => importText(text)}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <W3cMark size={14} />} Import
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
                    <FileUp size={14} /> Choose file
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onPasteButton} title="Paste from the clipboard">
                    <ClipboardPaste size={14} />
                    <span className="sr-only">Paste</span>
                  </Button>
                </div>
              </div>
              {dropToggle}
              {busy ? (
                <p role="status" className="mt-2 text-sm text-arcane">
                  {phase.label}…
                </p>
              ) : shownError ? (
                <p role="alert" className="mt-2 text-sm text-loss">
                  {shownError}
                </p>
              ) : null}
            </>
          )}
        </div>

        {done || phase.kind === "pick" ? (
          <Button type="button" variant="ghost" size="sm" onClick={reset} className="shrink-0">
            <RotateCcw size={14} /> {done ? "Import another" : "Cancel"}
          </Button>
        ) : null}
      </div>

      {phase.kind === "idle" ? (
        <p className="mt-3 text-[0.72rem] text-faint">
          Replays are read on the fly and not kept. In the overlay app, Export a private build or use Submit to site to land here with it loaded.
        </p>
      ) : null}

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

/** After a replay with several players is read: whose build to take. */
function PlayerPicker({ replay, onPick }: { replay: ReplayImport; onPick: (p: ReplayImportPlayer) => void }) {
  return (
    <div>
      <p className="font-display text-[0.8rem] font-bold uppercase tracking-[0.08em] text-fg">Whose build is it?</p>
      <p className="mt-0.5 text-sm text-muted">
        {replay.map}, a {replay.duration} game
        {replay.source?.url ? (
          <>
            {" "}
            <a href={replay.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline">
              on W3Champions <W3cMark size={11} />
            </a>
          </>
        ) : null}
        . Pick the player whose build order to import.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {replay.players.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className="flex items-center gap-3 rounded border border-line bg-surface/60 p-3 text-left transition-colors hover:border-gold/60 hover:bg-gold/5"
          >
            <RaceIcon race={p.race} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm font-bold uppercase text-fg">{p.name.replace(/#\d+$/, "")}</span>
              <span className="tnum block text-xs text-faint">
                {p.dropped > 0 ? `${p.build.steps.length} steps · ${p.dropped} dropped` : `${p.build.steps.length} steps`}
                {p.won === true ? <span className="ml-2 text-win">Won</span> : p.won === false ? <span className="ml-2 text-loss">Lost</span> : null}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
