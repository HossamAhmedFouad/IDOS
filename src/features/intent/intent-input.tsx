"use client";

import { useState, useCallback } from "react";
import { useWorkspaceStore } from "@/store/use-workspace-store";

export function IntentInput() {
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const pushHistory = useWorkspaceStore((s) => s.pushHistory);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = intent.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to parse intent");
      }
      const workspace = data.workspace;
      if (workspace) {
        setWorkspace(workspace);
        pushHistory(workspace);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [intent, loading, setWorkspace, pushHistory]);

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
      <input
        type="text"
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        placeholder="Describe what you want to do... (e.g. 'Take notes and set a 25 min timer')"
        disabled={loading}
        className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "..." : "Go"}
      </button>
      {error && (
        <span className="absolute left-0 right-0 top-full mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </form>
  );
}
