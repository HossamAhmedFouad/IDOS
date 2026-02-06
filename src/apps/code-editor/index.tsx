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
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col font-mono text-sm">
      {error && (
        <div className="shrink-0 rounded-b-none rounded-t border-b border-border bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
          {error}
        </div>
      )}
      {saving && (
        <div className="shrink-0 px-3 py-1 text-xs text-muted-foreground">
          Saving...
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted px-3 py-1.5">
        <span className="text-xs text-muted-foreground" title={filePath}>
          {filePath.split("/").pop() ?? "untitled"}
        </span>
      </div>
      <textarea
        spellCheck={false}
        className="h-full w-full resize-none rounded-b border-0 border-border bg-background p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-0"
        placeholder="// Start coding..."
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        style={{ tabSize: 2 }}
      />
    </div>
  );
}
