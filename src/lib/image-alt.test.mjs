/**
 * Every image the site renders must be able to carry alt text.
 *
 * Two halves, and both have failed before in other codebases: the markup
 * must set an `alt` attribute at all, and a CMS image must have somewhere
 * for an editor to *put* one. A body image with no alt field can only ever
 * render `alt=""` — announced as decorative, which for a diagram in a guide
 * means the content is silently missing for screen-reader users.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(p, out);
    else if (/\.(tsx|jsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

/** Comments out, so a doc comment that *mentions* an image element is not
 *  mistaken for one. Replaced with spaces rather than removed, to keep line
 *  numbers honest in the failure message. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

/** The text of every `<img`/`<Image` element, brace- and string-aware so a
 *  `>` inside a prop expression does not end it early. */
function imageElements(src) {
  const found = [];
  for (const m of src.matchAll(/<(img|Image)\b/g)) {
    let depth = 0;
    let inStr = null;
    for (let i = m.index; i < src.length; i++) {
      const c = src[i];
      if (inStr) {
        if (c === "\\") i++;
        else if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") inStr = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) {
        found.push({ tag: m[1], text: src.slice(m.index, i + 1), index: m.index });
        break;
      }
    }
  }
  return found;
}

test("every rendered image sets an alt attribute", () => {
  const offenders = [];
  let total = 0;
  for (const file of sourceFiles(join(ROOT, "src"))) {
    const src = stripComments(readFileSync(file, "utf8"));
    for (const el of imageElements(src)) {
      total++;
      if (!/\balt\s*=/.test(el.text)) {
        const line = src.slice(0, el.index).split("\n").length;
        offenders.push(`${file.replace(ROOT + "/", "")}:${line} <${el.tag}>`);
      }
    }
  }
  assert.ok(total >= 40, `only found ${total} image elements — did the scan break?`);
  assert.deepEqual(offenders, [], `images without alt:\n  ${offenders.join("\n  ")}`);
});

test("every CMS body image gives editors an alt field", () => {
  const dir = join(ROOT, "src/sanity/schemaTypes");
  const offenders = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const src = readFileSync(join(dir, file), "utf8");
    // A bare `{ type: "image" }` array member has no fields, so no alt.
    if (/defineArrayMember\(\{\s*type:\s*"image"\s*\}\)/.test(src)) offenders.push(file);
  }
  assert.deepEqual(
    offenders,
    [],
    `these schemas take body images with no alt field:\n  ${offenders.join("\n  ")}`,
  );
});
