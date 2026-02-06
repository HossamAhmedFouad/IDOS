"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";

const DEFAULT_PATH = "/code/main.js";

export function CodeEditorApp({ config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await readFile(filePath);
      setContent(text);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        setContent("");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const handleBlur = useCallback(async () => {
    if (saving || loading) return;
    setSaving(true);
    setError(null);
    try {
      await writeFile(filePath, content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [filePath, content, saving, loading]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col font-mono text-sm">
      {error && (
        <div className="shrink-0 rounded-b-none rounded-t border-b border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}
      {saving && (
        <div className="shrink-0 px-3 py-1 text-xs text-zinc-500 dark:text-zinc-400">
          Saving...
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
        <span className="text-xs text-zinc-500 dark:text-zinc-400" title={filePath}>
          {filePath.split("/").pop() ?? "untitled"}
        </span>
      </div>
      <textarea
        spellCheck={false}
        className="h-full w-full resize-none rounded-b border-0 border-zinc-200 bg-white p-3 font-mono text-sm text-zinc-900 outline-none focus:ring-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        placeholder="// Start coding..."
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        style={{ tabSize: 2 }}
      />
    </div>
  );
}
