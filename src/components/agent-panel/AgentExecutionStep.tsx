"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { cn } from "@/lib/utils";
import type { AgentEvent } from "@/lib/types/agent";

export type ExecutionStep =
  | { kind: "tool"; toolCall: AgentEvent; toolResult: AgentEvent | null }
  | { kind: "other"; event: AgentEvent };

const MAX_ARG_PREVIEW = 80;

function truncateContent(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}

function getArgSummary(args: Record<string, unknown>): string {
  const path = typeof args.path === "string" ? args.path : undefined;
  const content = typeof args.content === "string" ? args.content : undefined;
  if (path && content !== undefined) return path;
  if (path) return path;
  if (content !== undefined) return truncateContent(content, MAX_ARG_PREVIEW);
  return Object.keys(args).length ? JSON.stringify(args).slice(0, MAX_ARG_PREVIEW) : "";
}

export function AgentExecutionStepCard({
  step,
  stepIndex,
  defaultExpanded,
}: {
  step: ExecutionStep;
  stepIndex: number;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  if (step.kind === "other") {
    const e = step.event;
    if (e.type === "agent-start") return null;
    if (e.type === "user-message") {
      const d = e.data as { message?: string };
      return (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-2.5">
          <div className="mb-0.5 text-xs font-medium text-primary">Message</div>
          <div className="text-sm text-foreground">
            <MarkdownContent content={d.message ?? ""} />
          </div>
        </div>
      );
    }
    if (e.type === "agent-complete") {
      const d = e.data as { message?: string };
      return (
        <div className="rounded-lg border border-agent-accent/40 bg-[color-mix(in_oklch,var(--agent-accent)_12%,transparent)] p-2.5">
          <div className="mb-0.5 text-xs font-medium text-agent-accent-foreground">Task complete</div>
          <div className="text-sm text-foreground">
            <MarkdownContent content={d.message ?? "Done."} />
          </div>
        </div>
      );
    }
    if (e.type === "error") {
      const d = e.data as { message?: string };
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5">
          <div className="mb-0.5 text-xs font-medium text-destructive">Error</div>
          <div className="text-sm text-foreground">
            <MarkdownContent content={d.message ?? "Unknown error"} />
          </div>
        </div>
      );
    }
    if (e.type === "agent-timeout") {
      const d = e.data as { message?: string };
      return (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
          <div className="mb-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">Timeout</div>
          <div className="text-sm text-foreground">
            <MarkdownContent content={d.message ?? "Maximum iterations reached."} />
          </div>
        </div>
      );
    }
    if (e.type === "tool-result") {
      const d = e.data as { result?: { success?: boolean; error?: string }; toolName?: string };
      const success = d.result?.success ?? false;
      return (
        <div
          className={cn(
            "rounded-lg border p-2.5",
            success ? "border-green-500/30 bg-green-500/10" : "border-destructive/40 bg-destructive/10"
          )}
        >
          <div className={cn("mb-0.5 text-xs font-medium", success ? "text-green-600 dark:text-green-400" : "text-destructive")}>
            {success ? "Success" : "Failed"}
          </div>
          <div className="text-sm text-foreground">
            {success ? "Tool executed successfully" : <MarkdownContent content={d.result?.error ?? "Unknown error"} />}
          </div>
        </div>
      );
    }
    return null;
  }

  const { toolCall, toolResult } = step;
  const toolName = (toolCall.data?.toolName as string) ?? "";
  const thinking = (toolCall.data?.thinking as string) ?? "";
  const args = (toolCall.data?.args as Record<string, unknown>) ?? {};
  const argSummary = getArgSummary(args);
  const success = toolResult
    ? (toolResult.data?.result as { success?: boolean })?.success ?? false
    : null;
  const resultError = toolResult
    ? (toolResult.data?.result as { error?: string })?.error
    : undefined;

  const isPending = toolResult === null;
  const statusLabel = isPending ? "Running…" : success ? "Success" : "Failed";

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        isPending && "border-agent-accent/30 bg-[color-mix(in_oklch,var(--agent-accent)_8%,transparent)]",
        !isPending && success && "border-green-500/30 bg-green-500/5",
        !isPending && !success && "border-destructive/30 bg-destructive/5"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="font-mono text-xs text-foreground">{toolName}</span>
        <span className="text-xs text-muted-foreground">→</span>
        <span
          className={cn(
            "text-xs font-medium",
            isPending && "text-agent-accent-foreground",
            !isPending && success && "text-green-600 dark:text-green-400",
            !isPending && !success && "text-destructive"
          )}
        >
          {statusLabel}
        </span>
        {argSummary && !expanded && (
          <span className="min-w-0 truncate text-xs text-muted-foreground" title={argSummary}>
            {argSummary}
          </span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-border/60 px-2.5 py-2 space-y-2">
          {thinking && (
            <div>
              <div className="mb-0.5 text-xs font-medium text-muted-foreground">Thinking</div>
              <div className="text-sm text-muted-foreground">
                <MarkdownContent content={thinking} />
              </div>
            </div>
          )}
          <div>
            <div className="mb-0.5 text-xs font-medium text-muted-foreground">Tool</div>
            <div className="font-mono text-sm text-foreground">{toolName}</div>
          </div>
          {Object.keys(args).length > 0 && (
            <div>
              <div className="mb-0.5 text-xs font-medium text-muted-foreground">Args</div>
              <div className="text-xs text-foreground">
                {args.path != null && (
                  <div><span className="text-muted-foreground">path:</span> {String(args.path)}</div>
                )}
                {args.content != null && typeof args.content === "string" && (
                  <div className="mt-0.5">
                    <span className="text-muted-foreground">content:</span>{" "}
                    {truncateContent(args.content, 200)}
                  </div>
                )}
                {Object.keys(args).filter((k) => k !== "path" && k !== "content").length > 0 && (
                  <pre className="mt-0.5 overflow-x-auto text-xs">
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(args).filter(([k]) => k !== "path" && k !== "content")
                      ),
                      null,
                      0
                    )}
                  </pre>
                )}
              </div>
            </div>
          )}
          {toolResult && (
            <div>
              <div
                className={cn(
                  "mb-0.5 text-xs font-medium",
                  success ? "text-green-600 dark:text-green-400" : "text-destructive"
                )}
              >
                {success ? "Success" : "Failed"}
              </div>
              <div className="text-sm text-foreground">
                {success ? (
                  "Tool executed successfully"
                ) : (
                  <MarkdownContent content={resultError ?? "Unknown error"} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Build a list of steps from execution history: pair tool-call with next tool-result, keep others as single steps. */
export function buildExecutionSteps(history: AgentEvent[]): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  let i = 0;
  while (i < history.length) {
    const event = history[i];
    if (event.type === "tool-call") {
      const next = history[i + 1];
      if (next?.type === "tool-result") {
        steps.push({ kind: "tool", toolCall: event, toolResult: next });
        i += 2;
        continue;
      }
      steps.push({ kind: "tool", toolCall: event, toolResult: null });
      i += 1;
      continue;
    }
    if (event.type === "tool-result") {
      steps.push({ kind: "other", event });
      i += 1;
      continue;
    }
    steps.push({ kind: "other", event });
    i += 1;
  }
  return steps;
}
