"use client";
import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { nightBrackets, type NightBracket, type NightRow } from "@/lib/koth/night-board";

/**
 * One past night, folded. Opening it reads that night's board from the backend
 * in the browser, once: the backend's edge keeps a closed night's board for a
 * day, so a reader costs the database nothing after the first open, and the
 * site writes no cache entry for it. A crawler never opens a disclosure.
 */

const INFERRED = "Inferred from the order of play";
const WITHDREW = "Did not play the next series";
const UNKNOWN = "Neither player played the next series, so the winner is not known";

type State = { status: "idle" | "loading" | "error" } | { status: "ready"; brackets: NightBracket[] };

export function NightBoard({ api, id, summary }: { api: string; id: number; summary: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function load() {
    setState({ status: "loading" });
    try {
      const res = await fetch(`${api}/koth/nights/${id}/board`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setState({ status: "ready", brackets: nightBrackets(await res.json()) });
    } catch {
      setState({ status: "error" });
    }
  }

  return (
    <details
      className="group/night"
      onToggle={(e) => {
        if (e.currentTarget.open && state.status === "idle") void load();
      }}
    >
      <summary className="flex cursor-pointer list-none items-baseline gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/50 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{summary}</span>
        <ChevronDown size={14} className="shrink-0 self-center text-faint transition-transform group-open/night:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-line/40 bg-bg-deep/40 px-4 py-3">
        {state.status === "ready" ? (
          <div className="grid gap-x-4 gap-y-5 md:grid-cols-3">
            {state.brackets.map((b) => (
              <Bracket key={b.id} bracket={b} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-faint">
            {state.status === "error" ? "The results of this night could not be loaded." : "Loading the night…"}
          </p>
        )}
      </div>
    </details>
  );
}

function Bracket({ bracket }: { bracket: NightBracket }) {
  return (
    <section>
      <h4 className="font-display text-sm font-bold uppercase tracking-[0.06em] text-fg">{bracket.label}</h4>
      <p className="mt-0.5 text-xs text-faint">
        {bracket.king ? (
          <>
            Crowned <span className="text-gold">{bracket.king}</span>
          </>
        ) : (
          "No king recorded"
        )}
      </p>
      {bracket.rows.length ? (
        <ol className="mt-2 space-y-1 text-sm">
          {bracket.rows.map((row, i) => (
            <Series key={row.id} row={row} n={bracket.rows.length - i} />
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-faint">No series recorded.</p>
      )}
    </section>
  );
}

/** "winner beat loser", then what it did to the crown; "a vs b" when no winner is known. */
function Series({ row, n }: { row: NightRow; n: number }) {
  return (
    <li className="flex gap-2">
      <span className="tnum w-5 shrink-0 text-right text-xs leading-5 text-faint">{n}</span>
      <span className="min-w-0">
        {row.undecided ? (
          <>
            <span className="text-fg">{row.winner}</span> <span className="text-faint">vs</span>{" "}
            <span className="text-fg">{row.loser}</span>
            {row.withdrew ? <Aside text="Winner withdrew" title={UNKNOWN} /> : null}
          </>
        ) : (
          <>
            <span className="text-gold">{row.winner}</span> <span className="text-faint">beat</span>{" "}
            <span className="text-muted">{row.loser}</span>
            {row.forfeit ? <Aside text="Forfeit" title="The loser left the night" /> : null}
            {row.withdrew ? <Aside text="Withdrew" title={WITHDREW} /> : null}
            {row.crown ? <Aside text={row.crown} title={row.inferred ? INFERRED : undefined} /> : null}
          </>
        )}
        {row.note ? (
          <span className="ml-1.5 inline-flex align-[-2px] text-faint" title={row.note}>
            <Info size={12} aria-hidden />
            <span className="sr-only">{row.note}</span>
          </span>
        ) : null}
      </span>
    </li>
  );
}

function Aside({ text, title }: { text: string; title?: string }) {
  return (
    <span className="whitespace-nowrap text-xs text-faint" title={title}>
      {" · "}
      {text}
      {title ? <span className="sr-only">, {title.toLowerCase()}</span> : null}
    </span>
  );
}
