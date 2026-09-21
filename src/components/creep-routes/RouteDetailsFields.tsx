"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { ButtonLink, Button } from "@/components/ui/Button";
import { TagInput } from "@/components/builds/TagInput";
import { cn } from "@/lib/utils";

const input =
  "h-10 w-full rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";
const label = "block font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted";

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
        <label htmlFor={name} className={label}>{title}</label>
        {counter ? <span className="tnum text-[0.65rem] text-faint">{counter}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-loss">{error}</p> : hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

export type RouteDetailsText = {
  title: string;
  summary: string;
  patch: string;
  author: string;
  authorDiscord: string;
  sourceUrl: string;
  description: string;
};

/**
 * The details section of `RouteSubmitForm`: title, summary, patch, tags,
 * notes, credit and the submit row. Pulled into its own file purely to
 * keep `RouteSubmitForm.tsx` under the feature's own line-count target —
 * it owns no state itself, every field is controlled by the parent.
 */
export function RouteDetailsFields({
  text,
  bind,
  tags,
  onTagsChange,
  errors,
  errorMessage,
  pending,
  submissionsOpen,
}: {
  text: RouteDetailsText;
  bind: (k: keyof RouteDetailsText) => {
    id: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  };
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  errors: Record<string, string>;
  errorMessage?: string;
  pending: boolean;
  submissionsOpen: boolean;
}) {
  return (
    <section className="panel space-y-6 p-5 sm:p-7">
      <Field name="title" title="Title" error={errors.title} counter={`${text.title.length}/90`} hint='e.g. "Far Seer full clear into headhunters"'>
        <input {...bind("title")} required maxLength={90} className={input} />
      </Field>
      <Field name="summary" title="Summary" error={errors.summary} counter={`${text.summary.length}/200`} hint="Shown in the list. What is the idea, and when does it work?">
        <textarea {...bind("summary")} required rows={2} maxLength={200} className={cn(input, "h-auto py-2")} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="patch" title="Patch" error={errors.patch} hint="e.g. 2.0.3">
          <input {...bind("patch")} maxLength={16} placeholder="Optional" className={input} />
        </Field>
        <Field title="Tags" error={errors.tags} hint="Enter or comma to add. Up to 8.">
          <TagInput value={tags} onChange={onTagsChange} placeholder="fast expand, night attack…" />
        </Field>
      </div>
      <Field name="description" title="Notes" error={errors.description} counter={`${text.description.length}/6000`} hint="Optional. Blank line between paragraphs.">
        <textarea {...bind("description")} rows={4} maxLength={6000} className={cn(input, "h-auto py-2")} />
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

      {errorMessage ? (
        <p role="alert" className="rounded border border-loss/50 bg-loss/10 px-4 py-3 text-sm text-fg">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-5 border-t border-line/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-sm text-muted">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-gold" />
          <div>
            <p className="font-bold text-fg">Reviewed before it goes live</p>
            <p className="mt-0.5 text-xs">A coach checks every route, usually within a few days, then publishes it with your name on it.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <ButtonLink href="/learn/creep-routes" variant="ghost" size="lg" className="sm:w-auto">Cancel</ButtonLink>
          <Button type="submit" size="lg" disabled={pending || !submissionsOpen} className="sm:w-auto">
            {pending ? "Sending…" : "Submit for review"} <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}
