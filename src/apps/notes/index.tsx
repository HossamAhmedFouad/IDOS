"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";

const DEFAULT_PATH = "/notes/note.txt";

export function NotesApp({ config }: AppProps) {
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
    <div className="flex h-full flex-col p-4">
      {error && (
        <div className="mb-2 rounded bg-destructive/10 px-2 py-1 text-sm text-destructive">
          {error}
        </div>
      )}
      {saving && (
        <div className="mb-2 text-xs text-muted-foreground">Saving...</div>
      )}
      <textarea
        className="h-full w-full resize-none rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="Start typing..."
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
}
