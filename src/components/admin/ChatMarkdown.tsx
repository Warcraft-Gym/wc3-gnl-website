import type { ReactNode } from "react";

// Order matters: more specific delimiters (** ~~ ``) must be tried before the
// single-character ones (* _) they'd otherwise be mistaken for.
const INLINE_RE =
  /(\*\*(.+?)\*\*)|(~~(.+?)~~)|(`([^`]+?)`)|(\*(.+?)\*)|(_(.+?)_)|(\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const k = `${keyPrefix}-${i++}`;
    if (match[1]) nodes.push(<strong key={k}>{match[2]}</strong>);
    else if (match[3]) nodes.push(<s key={k}>{match[4]}</s>);
    else if (match[5])
      nodes.push(
        <code key={k} className="rounded bg-surface-2/70 px-1 py-0.5 font-mono text-[0.7rem]">
          {match[6]}
        </code>,
      );
    else if (match[7]) nodes.push(<em key={k}>{match[8]}</em>);
    else if (match[9]) nodes.push(<em key={k}>{match[10]}</em>);
    else if (match[11])
      nodes.push(
        <a
          key={k}
          href={match[13]}
          target="_blank"
          rel="noreferrer"
          className="text-arcane underline decoration-arcane/40 underline-offset-2 hover:decoration-arcane"
        >
          {match[12]}
        </a>,
      );
    lastIndex = INLINE_RE.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const FENCE_RE = /^```/;
const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const LIST_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

/**
 * Small markdown-to-JSX renderer for AI chat replies (headings, fenced code,
 * blockquotes, bullet/numbered lists, and bold/italic/code/strike/link marks).
 * Deliberately not a full markdown parser — just enough to make chat replies
 * readable without pulling in a markdown dependency.
 */
export function ChatMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const elements: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (FENCE_RE.test(line.trim())) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !FENCE_RE.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip the closing fence
      elements.push(
        <pre key={key++} className="overflow-x-auto rounded bg-surface-2/70 p-2 font-mono text-[0.7rem] text-fg">
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      elements.push(
        <p key={key++} className="font-bold text-fg">
          {renderInline(heading[2], `h${key}`)}
        </p>,
      );
      i++;
      continue;
    }

    const quote = line.match(QUOTE_RE);
    if (quote) {
      const quoteLines = [quote[1]];
      i++;
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        quoteLines.push(lines[i].replace(QUOTE_RE, "$1"));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="border-l-2 border-gold/60 pl-2 italic text-muted">
          {renderInline(quoteLines.join(" "), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    const list = line.match(LIST_RE);
    if (list) {
      const ordered = /^\d+\.$/.test(list[2]);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (!m) break;
        items.push(m[3]);
        i++;
      }
      const listClass = ordered ? "list-decimal space-y-0.5 pl-4" : "list-disc space-y-0.5 pl-4";
      elements.push(
        ordered ? (
          <ol key={key++} className={listClass}>
            {items.map((item, idx) => (
              <li key={idx}>{renderInline(item, `li${key}-${idx}`)}</li>
            ))}
          </ol>
        ) : (
          <ul key={key++} className={listClass}>
            {items.map((item, idx) => (
              <li key={idx}>{renderInline(item, `li${key}-${idx}`)}</li>
            ))}
          </ul>
        ),
      );
      continue;
    }

    // Paragraph: accumulate lines until a blank line or the start of another block type.
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !FENCE_RE.test(lines[i].trim()) &&
      !HEADING_RE.test(lines[i]) &&
      !QUOTE_RE.test(lines[i]) &&
      !LIST_RE.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    elements.push(<p key={key++}>{renderInline(paraLines.join(" "), `p${key}`)}</p>);
  }

  return <div className="space-y-1.5">{elements}</div>;
}
