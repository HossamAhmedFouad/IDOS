"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";

const DEFAULT_PATH = "/email/draft.json";

interface Draft {
  subject: string;
  body: string;
}

function parseDraft(json: string): Draft {
  try {
    const data = JSON.parse(json);
    return {
      subject: typeof data?.subject === "string" ? data.subject : "",
      body: typeof data?.body === "string" ? data.body : "",
    };
  } catch {
    return { subject: "", body: "" };
  }
}

export function EmailApp({ config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const text = await readFile(filePath);
      const draft = parseDraft(text);
      setSubject(draft.subject);
      setBody(draft.body);
    } catch {
      setSubject("");
      setBody("");
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      await writeFile(
        filePath,
        JSON.stringify({ subject, body }, null, 2)
      );
    } finally {
      setSaving(false);
    }
  }, [filePath, subject, body]);

  const handleBlur = useCallback(() => {
    saveDraft();
  }, [saveDraft]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      {saving && (
        <div className="mb-2 text-xs text-muted-foreground">Saving draft...</div>
      )}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={handleBlur}
          placeholder="Email subject"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Body
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={handleBlur}
          placeholder="Compose your email..."
          className="h-full w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </div>
  );
}
