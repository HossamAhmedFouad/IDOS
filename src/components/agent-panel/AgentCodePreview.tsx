"use client";

import { useEffect, useRef, useState } from "react";

const CODE_PREVIEW_TOOLS = new Set([
  "code_editor_write",
  "notes_create_note",
  "notes_append_to_note",
]);

const TYPEWRITER_CHUNK_SIZE = 40;
const TYPEWRITER_INTERVAL_MS = 25;

export interface CodePreviewState {
  toolName: string;
  path?: string;
  content: string;
}

/**
 * Small scrollable code preview with optional typewriter reveal.
 * Used when the agent is writing code (tool-call for code_editor_write / notes_* with content).
 */
export function AgentCodePreview({
  content,
  path,
  toolName,
  typewriter = true,
}: {
  content: string;
  path?: string;
  toolName: string;
  typewriter?: boolean;
}) {
  const scrollRef = useRef<HTMLPreElement>(null);
  const [revealedLength, setRevealedLength] = useState(
    typewriter ? 0 : content.length
  );

  useEffect(() => {
    if (!typewriter || content.length === 0) {
      setRevealedLength(content.length);
      return;
    }
    setRevealedLength(0);
  }, [content, typewriter]);

  useEffect(() => {
    if (!typewriter || revealedLength >= content.length) return;
    const t = setInterval(() => {
      setRevealedLength((prev) =>
        Math.min(prev + TYPEWRITER_CHUNK_SIZE, content.length)
      );
    }, TYPEWRITER_INTERVAL_MS);
    return () => clearInterval(t);
  }, [typewriter, content.length, revealedLength]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [revealedLength]);

  const displayContent = content.slice(0, revealedLength);

  return (
    <div className="rounded-lg border border-agent-accent/20 bg-[color-mix(in_oklch,var(--agent-accent)_6%,transparent)] overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-2 py-1">
        <span className="text-xs font-medium text-agent-accent-foreground truncate">
          Writing: {path ?? toolName}
        </span>
      </div>
      <pre
        ref={scrollRef}
        className="h-32 overflow-auto p-2 text-[10px] leading-tight font-mono text-foreground whitespace-pre break-all"
      >
        {displayContent}
      </pre>
    </div>
  );
}

export function getCodePreviewFromHistory(events: { type: string; data?: Record<string, unknown> }[]): CodePreviewState | null {
  if (events.length === 0) return null;
  const last = events[events.length - 1];
  if (last.type !== "tool-call" || !last.data) return null;
  const toolName = last.data.toolName as string;
  if (!toolName || !CODE_PREVIEW_TOOLS.has(toolName)) return null;
  const args = (last.data.args as Record<string, unknown>) ?? {};
  const content = typeof args.content === "string" ? args.content : "";
  const path = typeof args.path === "string" ? args.path : undefined;
  if (!content) return null;
  return { toolName, path, content };
}

/**
 * Whether the last event is a code tool-call that doesn't yet have a tool-result
 * (so we're either still executing the tool or waiting for the next round).
 */
export function isCodeToolCallPending(
  events: { type: string; data?: Record<string, unknown> }[]
): boolean {
  if (events.length === 0) return false;
  const last = events[events.length - 1];
  if (last.type !== "tool-call") return false;
  const toolName = last.data?.toolName as string;
  return !!toolName && CODE_PREVIEW_TOOLS.has(toolName);
}
