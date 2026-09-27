// Module hooks that let a node:test file import the site's TypeScript: `@/` maps
// to src/, an extensionless import tries .ts, "server-only" is empty, and a .ts
// file is transpiled with the repo's typescript package.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const SRC = new URL("../../", import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
  const url = specifier.startsWith("@/")
    ? new URL(specifier.slice(2), SRC)
    : specifier.startsWith(".") && context.parentURL?.endsWith(".ts")
      ? new URL(specifier, context.parentURL)
      : null;
  if (url) {
    for (const ext of ["", ".ts"]) {
      const file = fileURLToPath(url) + ext;
      if (/\.[cm]?[jt]s$/.test(file) && existsSync(file)) return { url: pathToFileURL(file).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (!url.endsWith(".ts")) return next(url, context);
  const { outputText } = ts.transpileModule(await readFile(fileURLToPath(url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
  });
  return { format: "module", source: outputText, shortCircuit: true };
}
