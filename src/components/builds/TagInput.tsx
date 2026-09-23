"use client";

import { useState } from "react";
import { X } from "lucide-react";

/** Chip input: type a tag, press Enter or comma, it becomes a chip. */
export function TagInput({
  value,
  onChange,
  max = 8,
  placeholder = "Add a tag…",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const t = draft.trim().toLowerCase().replace(/,+$/, "");
    if (t && !value.includes(t) && value.length < max) onChange([...value, t]);
    setDraft("");
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded border border-line bg-surface/60 px-2 py-1.5 focus-within:border-gold/60">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded border border-line bg-bg/60 px-2 py-0.5 text-xs text-fg">
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            aria-label={`Remove ${t}`}
            className="text-faint hover:text-loss"
          >
            <X size={13} />
          </button>
        </span>
      ))}
      {value.length < max ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={value.length ? "" : placeholder}
          maxLength={24}
          className="h-7 min-w-[7rem] flex-1 bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
        />
      ) : null}
    </div>
  );
}
