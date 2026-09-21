/** Parses a comma-separated env override, falling back to defaults when unset/empty. */
export function parseModelsEnv(raw: string | undefined, fallback: string[]): string[] {
  const parsed = raw?.split(",").map((m) => m.trim()).filter(Boolean);
  return parsed && parsed.length > 0 ? parsed : fallback;
}
