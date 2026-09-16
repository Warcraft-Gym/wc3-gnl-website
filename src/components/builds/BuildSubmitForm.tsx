"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, ChevronDown, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { submitBuild, type SubmitState } from "@/app/(site)/learn/builds/submit/actions";
import { IconPicker } from "./IconPicker";
import { TagInput } from "./TagInput";
import { RaceCrestRow, type CrestOption } from "./RaceCrestPicker";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { IconRace } from "@/lib/builds/icons";
import { BUILD_DIFFICULTIES, type BuildDifficulty } from "@/lib/builds/types";
import type { StepInput } from "@/lib/builds/submission";
import { cn } from "@/lib/utils";

type StepRow = { id: number; time: string; supply: string; instruction: string; icon: string };

const input =
  "h-10 w-full rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";
const label = "block font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted";

const newRow = (id: number): StepRow => ({ id, time: "", supply: "", instruction: "", icon: "" });

function Field({
  name,
  title,
  hint,
  error,
  counter,
  children,
}: {
  name?: string;
  title: string;
  hint?: string;
  error?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={name} className={label}>
          {title}
        </label>
        {counter ? <span className="tnum text-[0.65rem] text-faint">{counter}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-loss">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[1.05rem] font-bold tracking-[0.06em]">
      <span className="btn-gold grid size-7 shrink-0 place-items-center rounded font-display text-xs font-bold">{n}</span>
      {children}
    </h2>
  );
}

const initial: SubmitState = { status: "idle" };

export function BuildSubmitForm() {
  const [state, formAction, pending] = useActionState(submitBuild, initial);
  const [race, setRace] = useState<CrestOption | "">("");
  const [vsRace, setVsRace] = useState<CrestOption>("any");
  const [difficulty, setDifficulty] = useState<BuildDifficulty>("beginner");
  const [tags, setTags] = useState<string[]>([]);
  // Row ids are per-form counters (not a module global) so the server and
  // client render identical ids and hydration stays clean.
  const formId = useId();
  const nextId = useRef(4);
  const [steps, setSteps] = useState<StepRow[]>(() => [newRow(1), newRow(2), newRow(3)]);
  const [text, setText] = useState({
    title: "", patch: "", summary: "", description: "", author: "", authorDiscord: "", sourceUrl: "",
  });
  const bind = (k: keyof typeof text) => ({
    id: k,
    name: k,
    value: text[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setText((t) => ({ ...t, [k]: e.target.value })),
  });

  // Client-only timestamp for the fill-time spam check.
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setStartedAt(Date.now()), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Focus the instruction of a freshly added row.
  const focusRow = useRef<number | null>(null);
  useEffect(() => {
    if (focusRow.current === null) return;
    const el = document.querySelector<HTMLInputElement>(`[data-step="${formId}-${focusRow.current}"] input[aria-label=Instruction]`);
    el?.focus();
    focusRow.current = null;
  }, [steps.length]);

  const errors = state.status === "error" ? state.fields ?? {} : {};
  const stepsJson = JSON.stringify(
    steps.map<StepInput>((s) => ({
      time: s.time,
      supply: s.supply === "" ? undefined : Number(s.supply),
      instruction: s.instruction,
      icon: s.icon || undefined,
    })),
  );

  const update = (id: number, patch: Partial<StepRow>) =>
    setSteps((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const move = (index: number, dir: -1 | 1) =>
    setSteps((rows) => {
      const j = index + dir;
      if (j < 0 || j >= rows.length) return rows;
      const copy = [...rows];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  const remove = (id: number) => setSteps((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  const add = () =>
    setSteps((rows) => {
      const row = newRow(nextId.current++);
      const last = rows[rows.length - 1];
      // Start the new row's clock at the previous one's, as a nudge.
      if (last?.time) row.time = last.time;
      focusRow.current = row.id;
      return [...rows, row];
    });

  const iconRace = (race && race !== "any" ? race : undefined) as IconRace | undefined;

  if (state.status === "ok") {
    return (
      <div className="panel mx-auto max-w-2xl p-8 text-center sm:p-12">
        <CheckCircle2 size={40} className="mx-auto text-win" />
        <h2 className="mt-4 text-[1.4rem] font-bold tracking-[0.05em]">Thanks, it&apos;s in the queue</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          A coach will look it over and publish it, usually within a few days. It will appear in the
          build list with your name on it{text.authorDiscord ? ", we'll ping you on Discord if anything needs a tweak" : ""}.
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
    <form action={formAction}>
      {/* Honeypot + hidden state */}
      <div className="hidden" aria-hidden>
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="startedAt" value={startedAt} />
      <input type="hidden" name="stepsJson" value={stepsJson} />
      <input type="hidden" name="race" value={race === "any" ? "" : race} />
      <input type="hidden" name="vsRace" value={vsRace} />
      <input type="hidden" name="difficulty" value={difficulty} />
      <input type="hidden" name="tags" value={tags.join(",")} />

      <div className="min-w-0 space-y-8">
        {/* Guidance */}
        <details className="group rounded border border-gold/30 bg-gold/5 text-sm text-muted">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
            <span className="kicker">What makes a good submission</span>
            <ChevronDown size={16} className="shrink-0 text-gold transition-transform group-open:rotate-180" />
          </summary>
          <ul className="space-y-1.5 border-t border-gold/20 px-5 py-4">
            <li className="flex gap-2"><span className="text-gold">·</span> One opening, not a whole game plan. 10 to 20 steps is typical.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> Times from the in-game clock, so the play-along timer is useful.</li>
            <li className="flex gap-2"><span className="text-gold">·</span> An icon per step makes it scannable at a glance.</li>
            <li className="flex gap-2"><span className="text-gold">·</span><span>Say <em>why</em> in the notes: when it works, what it beats, what to watch for.</span></li>
          </ul>
        </details>

        {/* 1, The build */}
        <section className="panel space-y-6 p-5 sm:p-7">
          <SectionTitle n={1}>The build</SectionTitle>

          <Field name="title" title="Title" error={errors.title} counter={`${text.title.length}/90`} hint="e.g. Fast Death Knight into Fiends">
            <input {...bind("title")} required maxLength={90} className={input} />
          </Field>

          <div className="grid gap-6 md:grid-cols-2">
            <Field title="Your race" error={errors.race}>
              <RaceCrestRow value={race} onChange={setRace} size="sm" />
            </Field>
            <Field title="Against" error={errors.vsRace}>
              <RaceCrestRow value={vsRace} onChange={setVsRace} allowAny size="sm" />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-[auto_8rem_minmax(0,1fr)]">
            <Field title="Difficulty" error={errors.difficulty}>
              <div className="flex gap-1">
                {BUILD_DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    aria-pressed={difficulty === d.id}
                    className={cn(
                      "h-10 rounded border px-3 font-display text-[0.68rem] font-bold uppercase tracking-[0.1em] transition-colors",
                      difficulty === d.id ? "border-gold bg-gold/10 text-fg" : "border-line bg-surface/60 text-muted hover:text-fg",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field name="patch" title="Patch" error={errors.patch} hint="e.g. 2.0.3">
              <input {...bind("patch")} maxLength={16} placeholder="Optional" className={input} />
            </Field>
            <Field title="Tags" error={errors.tags} hint="Enter or comma to add. Up to 8.">
              <TagInput value={tags} onChange={setTags} placeholder="fast expand, tavern…" />
            </Field>
          </div>

          <Field
            name="summary"
            title="Summary"
            error={errors.summary}
            counter={`${text.summary.length}/200`}
            hint="Shown in the list. What is the idea, and when does it work?"
          >
            <textarea {...bind("summary")} required rows={2} maxLength={200} className={cn(input, "h-auto py-2")} />
          </Field>
        </section>

        {/* 2, Steps */}
        <section className="panel relative z-20 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionTitle n={2}>Steps</SectionTitle>
            {errors.steps ? <p className="text-xs text-loss">{errors.steps}</p> : null}
          </div>

          <div className="mt-4 hidden grid-cols-[2rem_4.5rem_4rem_3.25rem_minmax(0,1fr)_7.25rem] gap-x-2 px-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-faint sm:grid">
            <span>#</span><span>Time</span><span>Food</span><span>Icon</span><span>Instruction</span><span />
          </div>

          <ol className="mt-2 space-y-2">
            {steps.map((s, i) => {
              const err = (k: string) => errors[`steps.${i}.${k}`];
              return (
                <li
                  key={s.id}
                  data-step={`${formId}-${s.id}`}
                  className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 gap-y-2 rounded border border-line/70 bg-bg/40 p-2.5 focus-within:z-10 sm:grid-cols-[2rem_4.5rem_4rem_auto_minmax(0,1fr)_auto] sm:items-start sm:p-3"
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
                    <input
                      aria-label="Food"
                      placeholder="Food"
                      inputMode="numeric"
                      value={s.supply}
                      onChange={(e) => update(s.id, { supply: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                      className={cn(input, "tnum px-2")}
                    />
                  </div>

                  <div className="col-span-2 flex items-start gap-2 sm:contents">
                    <IconPicker value={s.icon} onChange={(k) => update(s.id, { icon: k })} race={iconRace} />
                    <div className="min-w-0 flex-1">
                      <input
                        aria-label="Instruction"
                        placeholder="What to do"
                        value={s.instruction}
                        onChange={(e) => update(s.id, { instruction: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && i === steps.length - 1) {
                            e.preventDefault();
                            add();
                          }
                        }}
                        maxLength={160}
                        className={cn(input, err("instruction") && "border-loss")}
                      />
                      {err("instruction") ? <p className="mt-1 text-[0.65rem] text-loss">{err("instruction")}</p> : null}
                    </div>
                  </div>

                  <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="grid size-10 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Move down" className="grid size-10 place-items-center rounded border border-line text-muted hover:text-gold disabled:opacity-30">
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" onClick={() => remove(s.id)} disabled={steps.length === 1} aria-label="Remove step" className="grid size-10 place-items-center rounded border border-line text-muted hover:border-loss/60 hover:text-loss disabled:opacity-30">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={add}
              className="inline-flex h-10 items-center gap-2 rounded border border-gold/50 px-4 font-display text-[0.72rem] font-bold uppercase tracking-[0.1em] text-gold hover:bg-gold/10"
            >
              <Plus size={14} /> Add step
            </button>
            <span className="text-xs text-faint">Enter on the last instruction adds a step.</span>
          </div>
        </section>

        {/* 3, Notes & credit */}
        <section className="panel space-y-6 p-5 sm:p-7">
          <SectionTitle n={3}>Notes &amp; credit</SectionTitle>

          <Field
            name="description"
            title="Notes"
            error={errors.description}
            counter={`${text.description.length}/6000`}
            hint="Optional. When to use it, transitions, what to watch for. Blank line between paragraphs."
          >
            <textarea {...bind("description")} rows={5} maxLength={6000} className={cn(input, "h-auto py-2")} />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field name="author" title="Your name" error={errors.author} hint="Shown as the author.">
              <input {...bind("author")} required maxLength={60} className={input} />
            </Field>
            <Field name="authorDiscord" title="Discord handle" error={errors.authorDiscord} hint="Optional, so coaches can reach you.">
              <input {...bind("authorDiscord")} maxLength={60} className={input} />
            </Field>
          </div>
          <Field name="sourceUrl" title="Source link" error={errors.sourceUrl} hint="Optional replay, VOD or post.">
            <input {...bind("sourceUrl")} type="url" maxLength={300} placeholder="https://" className={input} />
          </Field>

          {state.status === "error" ? (
            <p role="alert" className="rounded border border-loss/50 bg-loss/10 px-4 py-3 text-sm text-fg">
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-col gap-5 border-t border-line/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 text-sm text-muted">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-gold" />
              <div>
                <p className="font-bold text-fg">Reviewed before it goes live</p>
                <p className="mt-0.5 text-xs">
                  A coach checks every build, usually within a few days, then publishes it with your name on it.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <ButtonLink href="/learn/builds" variant="ghost" size="lg" className="sm:w-auto">
                Cancel
              </ButtonLink>
              <Button type="submit" size="lg" disabled={pending} className="sm:w-auto">
                {pending ? "Sending…" : "Submit for review"} <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </section>
      </div>

    </form>
  );
}
