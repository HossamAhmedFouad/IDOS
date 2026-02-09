"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";
import { useToolRegistry } from "@/store/use-tool-registry";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useAgentStore } from "@/store/use-agent-store";
import { createEmailTools } from "./tools";

const DEFAULT_PATH = "/email/draft.json";

interface Draft {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

function parseDraft(json: string): Draft {
  try {
    const data = JSON.parse(json);
    return {
      to: typeof data?.to === "string" ? data.to : "",
      subject: typeof data?.subject === "string" ? data.subject : "",
      body: typeof data?.body === "string" ? data.body : "",
      html: typeof data?.html === "string" ? data.html : undefined,
    };
  } catch {
    return { to: "", subject: "", body: "" };
  }
}

export function EmailApp({ id, config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const registerTool = useToolRegistry((s) => s.registerTool);
  const emailTools = useMemo(() => createEmailTools(id), [id]);

  useEffect(() => {
    emailTools.forEach((tool) => registerTool(tool));
    // Do not unregister on unmount: agent may still have in-flight tool calls for this app.
  }, [emailTools, registerTool]);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");
  const [sendError, setSendError] = useState("");

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const text = await readFile(filePath);
      const draft = parseDraft(text);
      setTo(draft.to);
      setSubject(draft.subject);
      setBody(draft.body);
      setHtml(draft.html ?? "");
    } catch {
      setTo("");
      setSubject("");
      setBody("");
      setHtml("");
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const view = useWorkspaceStore((s) => s.view);
  const agentDataVersion = useAgentStore((s) => s.agentDataVersion);
  useEffect(() => {
    if (view === "agent" && agentDataVersion > 0) {
      loadDraft();
    }
  }, [view, agentDataVersion, loadDraft]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      await writeFile(
        filePath,
        JSON.stringify({ to, subject, body, html }, null, 2)
      );
    } finally {
      setSaving(false);
    }
  }, [filePath, to, subject, body, html]);

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      setSendStatus("error");
      setSendError("Enter a recipient email address.");
      return;
    }
    setSending(true);
    setSendStatus("idle");
    setSendError("");
    try {
      const payload: { to: string; subject: string; text: string; html?: string } = {
        to: to.trim(),
        subject: subject.trim(),
        text: body.trim(),
      };
      if (html.trim()) payload.html = html.trim();
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendStatus("error");
        setSendError(data?.error ?? "Failed to send email.");
        return;
      }
      setSendStatus("success");
      // Clear draft (including html) so next email doesn't reuse old content
      setTo("");
      setSubject("");
      setBody("");
      setHtml("");
      try {
        await writeFile(filePath, JSON.stringify({ to: "", subject: "", body: "" }, null, 2));
      } catch {
        // ignore persist failure
      }
    } finally {
      setSending(false);
    }
  }, [to, subject, body, html, filePath]);

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
    <div id={id} className="flex h-full flex-col p-4">
      {sendStatus !== "idle" && (
        <div className="mb-2 text-xs">
          {sendStatus === "success" && <span className="text-green-600 dark:text-green-400">Email sent.</span>}
          {sendStatus === "error" && <span className="text-red-600 dark:text-red-400">{sendError}</span>}
        </div>
      )}
      <div className="mb-3" data-email-to>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          To
        </label>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          onBlur={handleBlur}
          placeholder="recipient@example.com"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div className="mb-3" data-email-subject>
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
      <div className="mb-3 flex-1 min-h-0" data-email-body>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Body
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={handleBlur}
          placeholder="Compose your email..."
          className="h-full w-full min-h-[120px] resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <div data-email-attachments className="mb-3 flex flex-wrap gap-1" />
      <button
        type="button"
        onClick={handleSend}
        disabled={sending || !to.trim()}
        className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
      >
        {sending ? "Sending…" : "Send"}
      </button>
    </div>
  );
}
