"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PortableBody } from "@/components/sanity/PortableBody";
import { AiAssistPanel } from "./AiAssistPanel";
import { ChatWidget } from "./ChatWidget";
import { parseBodyMarkdown, serializeBodyMarkdown, type PortableBlock } from "@/lib/admin/portableTextMarkdown";
import { GUIDE_CATEGORIES, LEVELS, POST_CATEGORIES } from "@/lib/admin/schemas";
import { slugify } from "@/lib/utils";

type ArticleType = "post" | "guide";

export type InitialArticle = {
  title?: string;
  slug?: string | { current?: string };
  excerpt?: string;
  category?: string;
  level?: string;
  author?: string;
  readingMinutes?: number;
  publishedAt?: string;
  coverImage?: { asset?: { _ref?: string } };
  body?: PortableBlock[];
};

const inputClass =
  "h-10 w-full rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";
const labelClass = "block font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted";
const textareaClass =
  "w-full rounded border border-line bg-surface/60 px-3 py-2 font-mono text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";

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
        <label htmlFor={name} className={labelClass}>
          {title}
        </label>
        {counter ? <span className="text-[0.65rem] text-faint">{counter}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-loss">{error}</p> : hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

async function uploadImage(file: File): Promise<{ assetId: string } | null> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/assets/upload", { method: "POST", body: form });
  if (!res.ok) return null;
  return res.json();
}

function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export function ArticleForm({
  type,
  articleId,
  initial,
}: {
  type: ArticleType;
  articleId?: string;
  initial?: InitialArticle;
}) {
  const router = useRouter();
  const isNew = !articleId;
  const initialSlug = typeof initial?.slug === "string" ? initial.slug : initial?.slug?.current;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slugOverride, setSlugOverride] = useState(initialSlug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialSlug));
  const slug = slugTouched ? slugOverride : slugify(title);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [category, setCategory] = useState(initial?.category ?? (type === "post" ? POST_CATEGORIES[0] : GUIDE_CATEGORIES[0]));
  const [level, setLevel] = useState(initial?.level ?? LEVELS[0]);
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [readingMinutes, setReadingMinutes] = useState(initial?.readingMinutes ?? 4);
  const [coverImageRef, setCoverImageRef] = useState<string | undefined>(initial?.coverImage?.asset?._ref);
  const [body, setBody] = useState(() => serializeBodyMarkdown(initial?.body ?? []));

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const previewBlocks = useMemo(() => {
    try {
      return parseBodyMarkdown(body);
    } catch {
      return [];
    }
  }, [body]);

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((b) => `${b}\n\n${text}\n\n`);
      return;
    }
    const { selectionStart, selectionEnd, value } = el;
    setBody(`${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`);
  };

  const wrapSelection = (marker: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd) || "text";
    insertAtCursor(`${marker}${selected}${marker}`);
  };

  const prefixLine = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, value } = el;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    setBody(`${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`);
  };

  // Indentation drives list nesting level, so Tab/Shift+Tab (or the buttons)
  // add/remove 2 spaces across every line touched by the selection.
  const indentLines = (direction: 1 | -1) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const nextBreak = value.indexOf("\n", selectionEnd);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const updated = value
      .slice(lineStart, lineEnd)
      .split("\n")
      .map((line) => (direction === 1 ? `  ${line}` : line.replace(/^ {1,2}/, "")))
      .join("\n");
    setBody(`${value.slice(0, lineStart)}${updated}${value.slice(lineEnd)}`);
  };

  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    indentLines(e.shiftKey ? -1 : 1);
  };

  const onInsertLink = () => {
    const url = window.prompt("Link URL (https://…):");
    if (!url) return;
    const el = textareaRef.current;
    const selected = el ? el.value.slice(el.selectionStart, el.selectionEnd) : "";
    insertAtCursor(`[${selected || "link text"}](${url})`);
  };

  const onInsertImage = async () => {
    const file = await pickImageFile();
    if (!file) return;
    const uploaded = await uploadImage(file);
    if (!uploaded) {
      setError("Image upload failed");
      return;
    }
    const alt = window.prompt("Alt text (describes the image for readers/SEO):") ?? "";
    insertAtCursor(`\n\n{{image:${uploaded.assetId}${alt ? `|${alt}` : ""}}}\n\n`);
  };

  const onCoverImage = async () => {
    const file = await pickImageFile();
    if (!file) return;
    const uploaded = await uploadImage(file);
    if (uploaded) setCoverImageRef(uploaded.assetId);
  };

  const onInsertYoutube = () => {
    const url = window.prompt("YouTube or Vimeo URL:");
    if (url) insertAtCursor(`\n\n{{youtube:${url}}}\n\n`);
  };

  const save = async (publish: boolean) => {
    setPending(true);
    setError(null);
    setFieldErrors({});
    setNotice(null);
    try {
      const data: Record<string, unknown> = {
        title,
        slug,
        excerpt,
        readingMinutes: Number(readingMinutes),
        publishedAt: initial?.publishedAt ?? new Date().toISOString(),
        body: parseBodyMarkdown(body),
        coverImageRef,
        category,
      };
      if (type === "post") data.author = author;
      if (type === "guide") data.level = level;

      const res = isNew
        ? await fetch("/api/admin/articles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, data }),
          })
        : await fetch(`/api/admin/articles/${articleId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, data }),
          });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save");
        setFieldErrors(json.fields ?? {});
        return;
      }

      const id = isNew ? (json.id as string) : (articleId as string);

      if (publish) {
        const pubRes = await fetch(`/api/admin/articles/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, action: "publish" }),
        });
        const pubJson = await pubRes.json();
        if (!pubRes.ok) {
          setError(pubJson.error ?? "Saved as a draft, but publishing failed");
          if (isNew) router.replace(`/admin/${type}s/${id}`);
          return;
        }
      }

      setNotice(publish ? "Published." : "Draft saved.");
      if (isNew) router.replace(`/admin/${type}s/${id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const categories = type === "post" ? POST_CATEGORIES : GUIDE_CATEGORIES;

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Back to editor" : "Preview"}
        </Button>
      </div>

      {showPreview ? (
        <div className="rounded border border-line bg-surface/40 p-6">
          <h1 className="mb-2 font-display text-2xl font-bold text-fg">{title || "Untitled"}</h1>
          <p className="mb-4 text-sm text-muted">{excerpt}</p>
          <PortableBody value={previewBlocks} />
        </div>
      ) : (
      <div className="space-y-5">
        <Field name="title" title="Title" error={fieldErrors.title}>
          <input id="title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field name="slug" title="Slug" error={fieldErrors.slug}>
          <input
            id="slug"
            className={inputClass}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlugOverride(e.target.value);
            }}
          />
        </Field>

        <Field name="excerpt" title="Excerpt" error={fieldErrors.excerpt} counter={`${excerpt.length}/280`}>
          <textarea
            id="excerpt"
            rows={3}
            maxLength={280}
            className={textareaClass}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field name="category" title="Category" error={fieldErrors.category}>
            <select id="category" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          {type === "guide" ? (
            <Field name="level" title="Level" error={fieldErrors.level}>
              <select id="level" className={inputClass} value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field name="author" title="Author" error={fieldErrors.author}>
              <input id="author" className={inputClass} value={author} onChange={(e) => setAuthor(e.target.value)} />
            </Field>
          )}
        </div>

        <Field name="readingMinutes" title="Reading time (minutes)" error={fieldErrors.readingMinutes}>
          <input
            id="readingMinutes"
            type="number"
            min={1}
            max={60}
            className={inputClass}
            value={readingMinutes}
            onChange={(e) => setReadingMinutes(Number(e.target.value))}
          />
        </Field>

        <Field title="Cover image">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onCoverImage}>
              {coverImageRef ? "Replace" : "Upload"}
            </Button>
            {coverImageRef ? <span className="text-xs text-faint">Set</span> : null}
          </div>
        </Field>

        <Field
          name="body"
          title="Body"
          error={fieldErrors.body}
          hint="## heading, ### subheading, > quote, - bullet, 1. number (indent 2 spaces per level, or Tab/Shift+Tab), **bold**, *italic*, `code`, ~~strike~~, [link](https://…)"
        >
          <div className="mb-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => wrapSelection("**")}>
              Bold
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => wrapSelection("*")}>
              Italic
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => wrapSelection("~~")}>
              Strike
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => wrapSelection("`")}>
              Code
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => prefixLine("## ")}>
              H2
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => prefixLine("### ")}>
              H3
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => prefixLine("> ")}>
              Quote
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => prefixLine("- ")}>
              Bullet
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => prefixLine("1. ")}>
              Numbered
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => indentLines(-1)}>
              Outdent
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => indentLines(1)}>
              Indent
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onInsertLink}>
              Link
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onInsertImage}>
              Image
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onInsertYoutube}>
              YouTube
            </Button>
          </div>
          <textarea
            ref={textareaRef}
            id="body"
            rows={18}
            className={textareaClass}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onBodyKeyDown}
          />
        </Field>
      </div>
      )}

      <div className="mt-6">
        <AiAssistPanel
          type={type}
          title={title}
          body={body}
          onApplyDraft={(result) => {
            setTitle(result.title);
            setExcerpt(result.excerpt);
            setBody(result.body);
          }}
          onApplyBody={setBody}
          onApplySeo={(result) => {
            setTitle(result.title);
            setExcerpt(result.excerpt);
          }}
        />
      </div>

      <ChatWidget
        type={type}
        title={title}
        excerpt={excerpt}
        body={body}
        onApplyChat={(result) => {
          if (result.title !== undefined) setTitle(result.title);
          if (result.excerpt !== undefined) setExcerpt(result.excerpt);
          if (result.body !== undefined) setBody(result.body);
        }}
      />

      {error ? <p className="mt-5 text-sm text-loss">{error}</p> : null}
      {notice ? <p className="mt-5 text-sm text-win">{notice}</p> : null}

      <div className="mt-5 flex gap-3">
        <Button type="button" variant="outline" disabled={pending || !title} onClick={() => save(false)}>
          Save draft
        </Button>
        <Button type="button" disabled={pending || !title} onClick={() => save(true)}>
          Save &amp; publish
        </Button>
      </div>
    </div>
  );
}

