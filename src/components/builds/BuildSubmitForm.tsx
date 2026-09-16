"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { submitBuild, type SubmitState } from "@/app/(site)/learn/builds/submit/actions";
import { GameIcon } from "./GameIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { RaceIcon } from "@/components/ui/RaceIcon";
import { GAME_ICONS, type IconRace } from "@/lib/builds/icons";
import { BUILD_DIFFICULTIES, BUILD_RACES, type BuildRace } from "@/lib/builds/types";
import type { StepInput } from "@/lib/builds/submission";
import { cn } from "@/lib/utils";

type StepRow = { id: number; time: string; supply: string; instruction: string; icon: string };

const input =
  "h-10 w-full rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";
const label = "block font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted";

const RACE_GROUP: Record<IconRace, string> = {
  human: "Human",
  orc: "Orc",
  nightelf: "Night Elf",
  undead: "Undead",
  neutral: "Neutral",
};

let nextId = 1;
const newRow = (): StepRow => ({ id: nextId++, time: "", supply: "", instruction: "", icon: "" });

function Field({
  name,
  title,
  hint,
  error,
  children,
}: {
  name: string;
  title: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className={label}>
        {title}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-loss">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

function RacePicker({
  name,
  value,
  onChange,
  allowAny,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  allowAny?: boolean;
}) {
  const options: { id: string; label: string }[] = [
    ...BUILD_RACES,
    ...(allowAny ? [{ id: "any", label: "Any" }] : []),
  ];
  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value} />
      {options.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          aria-pressed={value === r.id}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded border px-3 text-sm font-bold transition-colors",
            value === r.id
              ? "border-gold bg-gold/10 text-fg"
              : "border-line bg-surface/60 text-muted hover:border-gold/50 hover:text-fg",
          )}
        >
          <RaceIcon race={r.id === "any" ? "random" : (r.id as BuildRace)} size={18} />
          {r.label}
        </button>
      ))}
    </div>
  );
}

const initial: SubmitState = { status: "idle" };

export function BuildSubmitForm() {
  const [state, formAction, pending] = useActionState(submitBuild, initial);
  const [race, setRace] = useState("");
  const [vsRace, setVsRace] = useState("any");
  const [difficulty, setDifficulty] = useState("beginner");
  // Text fields are controlled so a server-side validation error doesn't
  // wipe them (React resets uncontrolled form fields after an action).
  const [text, setText] = useState({
    title: "", patch: "", tags: "", summary: "", description: "", author: "", authorDiscord: "", sourceUrl: "",
  });
  const bind = (k: keyof typeof text) => ({
    id: k,
    name: k,
    value: text[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setText((t) => ({ ...t, [k]: e.target.value })),
  });
  const [steps, setSteps] = useState<StepRow[]>(() => [newRow(), newRow(), newRow()]);
  // Set on the client after mount (a server-rendered timestamp would be
  // stale and differ from the client's, tripping hydration).
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setStartedAt(Date.now()), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Icons grouped for the <select>: the chosen race first, then the rest.
  const iconGroups = useMemo(() => {
    const order: IconRace[] = ["human", "orc", "nightelf", "undead", "neutral"];
    const first = order.filter((r) => r === race);
    const rest = order.filter((r) => r !== race);
    return [...first, ...rest].map((r) => ({
      race: r,
      icons: GAME_ICONS.filter((i) => i.race === r),
    }));
  }, [race]);

  const errors = state.status === "error" ? state.fields ?? {} : {};
  const stepsJson = JSON.stringify(
    steps.map<StepInput>((s) => ({
      time: s.time,
      supply: s.supply === "" ? undefined : Number(s.supply),
      instruction: s.instruction,
      icon: s.icon || undefined,
    })),
  );

  function update(id: number, patch: Partial<StepRow>) {
    setSteps((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function move(index: number, dir: -1 | 1) {
    setSteps((rows) => {
      const j = index + dir;
      if (j < 0 || j >= rows.length) return rows;
      const copy = [...rows];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  }
  function remove(id: number) {
    setSteps((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  if (state.status === "ok") {
    return (
      <div className="panel p-8 text-center sm:p-12">
        <CheckCircle2 size={40} className="mx-auto text-win" />
        <h2 className="mt-4 text-[1.4rem] font-bold tracking-[0.05em]">Thanks — it&apos;s in the queue</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          A coach will look it over and publish it, usually within a few days. It will appear in the
          build list with your name on it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/learn/builds">Back to builds</ButtonLink>
          <ButtonLink href="/learn/builds/submit" variant="outline">
            Submit another
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-10">
      {/* Honeypot + timing, invisible to people */}
      <div className="hidden" aria-hidden>
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="startedAt" value={startedAt} />
      <input type="hidden" name="stepsJson" value={stepsJson} />

      {/* About the build */}
      <section className="panel space-y-6 p-5 sm:p-7">
        <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">The build</h2>

        <Field name="title" title="Title" error={errors.title} hint="e.g. Fast Death Knight into Fiends">
          <input {...bind("title")} required maxLength={90} className={input} />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field name="race" title="Your race" error={errors.race}>
            <RacePicker name="race" value={race} onChange={setRace} />
          </Field>
          <Field name="vsRace" title="Against" error={errors.vsRace}>
            <RacePicker name="vsRace" value={vsRace} onChange={setVsRace} allowAny />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-[1fr_1fr_1.4fr]">
          <Field name="difficulty" title="Difficulty" error={errors.difficulty}>
            <select
              id="difficulty"
              name="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={input}
            >
              {BUILD_DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <Field name="patch" title="Patch" error={errors.patch} hint="Optional, e.g. 2.0.3">
            <input {...bind("patch")} maxLength={16} className={input} />
          </Field>
          <Field name="tags" title="Tags" error={errors.tags} hint="Comma-separated, e.g. fast expand, tavern">
            <input {...bind("tags")} maxLength={200} className={input} />
          </Field>
        </div>

        <Field
          name="summary"
          title="Summary"
          error={errors.summary}
          hint="One or two sentences shown in the list. What is the idea, and when does it work?"
        >
          <textarea {...bind("summary")} required rows={2} maxLength={200} className={cn(input, "h-auto py-2")} />
        </Field>
      </section>

      {/* Steps */}
      <section className="panel p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">Steps</h2>
            <p className="mt-1 text-xs text-faint">
              Time and food are optional but make the play-along clock work. Pick an icon so the step is easy to scan.
            </p>
          </div>
          {errors.steps ? <p className="text-xs text-loss">{errors.steps}</p> : null}
        </div>

        <ol className="mt-5 space-y-3">
          {steps.map((s, i) => {
            const err = (k: string) => errors[`steps.${i}.${k}`];
            return (
              <li
                key={s.id}
                className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded border border-line/70 bg-bg/40 p-3 sm:grid-cols-[2rem_4.5rem_4rem_minmax(0,1fr)_auto] sm:items-start"
              >
                <span className="tnum pt-2.5 text-center text-xs text-faint">{i + 1}</span>

                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <div>
                    <input
                      aria-label="Time"
                      placeholder="m:ss"
                      value={s.time}
                      onChange={(e) => update(s.id, { time: e.target.value })}
                      className={cn(input, "tnum px-2", err("time") && "border-loss")}
                    />
                    {err("time") ? <p className="mt-1 text-[0.65rem] text-loss">{err("time")}</p> : null}
                  </div>
                  <div>
                    <input
                      aria-label="Food"
                      placeholder="Food"
                      inputMode="numeric"
                      value={s.supply}
                      onChange={(e) => update(s.id, { supply: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                      className={cn(input, "tnum px-2", err("supply") && "border-loss")}
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-10 shrink-0 place-items-center">
                      {s.icon ? (
                        <GameIcon iconKey={s.icon} size={32} />
                      ) : (
                        <span className="size-8 rounded border border-dashed border-line" />
                      )}
                    </span>
                    <select
                      aria-label="Icon"
                      value={s.icon}
                      onChange={(e) => update(s.id, { icon: e.target.value })}
                      className={cn(input, "w-[calc(100%-3rem)] shrink-0 px-2 sm:w-44")}
                    >
                      <option value="">No icon</option>
                      {iconGroups.map((g) => (
                        <optgroup key={g.race} label={RACE_GROUP[g.race]}>
                          {g.icons.map((ic) => (
                            <option key={ic.key} value={ic.key}>
                              {ic.title}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <input
                      aria-label="Instruction"
                      placeholder="What to do"
                      value={s.instruction}
                      onChange={(e) => update(s.id, { instruction: e.target.value })}
                      maxLength={160}
                      className={cn(input, "min-w-[10rem] flex-1", err("instruction") && "border-loss")}
                    />
                  </div>
                  {err("instruction") ? <p className="mt-1 text-[0.65rem] text-loss">{err("instruction")}</p> : null}
                </div>

                <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="grid size-10 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === steps.length - 1}
                    aria-label="Move down"
                    className="grid size-10 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    disabled={steps.length === 1}
                    aria-label="Remove step"
                    className="grid size-10 place-items-center rounded border border-line text-muted hover:border-loss/60 hover:text-loss disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={() => setSteps((rows) => [...rows, newRow()])}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded border border-gold/50 px-4 font-display text-[0.72rem] font-bold uppercase tracking-[0.1em] text-gold hover:bg-gold/10"
        >
          <Plus size={14} /> Add step
        </button>
      </section>

      {/* Notes + credit */}
      <section className="panel space-y-6 p-5 sm:p-7">
        <h2 className="text-[1.05rem] font-bold tracking-[0.06em]">Notes &amp; credit</h2>

        <Field
          name="description"
          title="Notes"
          error={errors.description}
          hint="Optional. When to use it, transitions, what to watch for. Blank line between paragraphs."
        >
          <textarea {...bind("description")} rows={6} maxLength={6000} className={cn(input, "h-auto py-2")} />
        </Field>

        <div className="grid gap-6 sm:grid-cols-3">
          <Field name="author" title="Your name" error={errors.author} hint="Shown as the author.">
            <input {...bind("author")} required maxLength={60} className={input} />
          </Field>
          <Field name="authorDiscord" title="Discord handle" error={errors.authorDiscord} hint="Optional, so coaches can reach you.">
            <input {...bind("authorDiscord")} maxLength={60} className={input} />
          </Field>
          <Field name="sourceUrl" title="Source link" error={errors.sourceUrl} hint="Optional replay, VOD or post.">
            <input {...bind("sourceUrl")} type="url" maxLength={300} className={input} />
          </Field>
        </div>
      </section>

      {state.status === "error" ? (
        <p role="alert" className="rounded border border-loss/50 bg-loss/10 px-4 py-3 text-sm text-fg">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Submit for review"}
        </Button>
        <p className="text-xs text-faint">
          A coach checks every submission before it goes live.{" "}
          <Link href="/learn/builds" className="text-muted hover:text-gold">
            Back to builds
          </Link>
        </p>
      </div>
    </form>
  );
}
