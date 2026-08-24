import { Database } from "lucide-react";
import type { DataSource } from "@/lib/api/gnl";

/**
 * Small honesty banner: shown only when a page is rendering fixture data
 * instead of the live Flask API, so nobody mistakes sample data for real
 * standings. Rendered in non-production only.
 */
export function DataSourceNote({ source }: { source: DataSource }) {
  if (source === "live" || process.env.NODE_ENV === "production") return null;
  return (
    <div className="mb-6 flex items-center gap-2 rounded border border-arcane/30 bg-arcane/5 px-3 py-2 text-xs text-arcane">
      <Database size={13} />
      Sample data — set{" "}
      <code className="rounded bg-surface-2 px-1 font-mono">GNL_API_BASE_URL</code>{" "}
      to render live league data from the Flask backend.
    </div>
  );
}
