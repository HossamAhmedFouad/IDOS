"use client";

import Link from "next/link";
import { useAgentStore } from "@/store/use-agent-store";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import type { AgentEvent } from "@/lib/types/agent";

const API_KEY_INVALID_CODE = "API_KEY_INVALID";

function AgentCardBody({ text }: { text: string }) {
  return <MarkdownContent content={text} />;
}

export function AgentEventCard({ event }: { event: AgentEvent }) {
  if (event.type === "agent-start") {
    return null;
  }

  if (event.type === "user-message") {
    const d = event.data as { message?: string };
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
        <div className="mb-1 text-xs font-medium text-primary">
          Message
        </div>
        <div className="text-sm text-foreground">
          <AgentCardBody text={d.message ?? ""} />
        </div>
      </div>
    );
  }

  if (event.type === "tool-call") {
    const d = event.data as { toolName?: string; thinking?: string };
    return (
      <div className="rounded-lg border border-agent-accent/40 bg-[color-mix(in_oklch,var(--agent-accent)_12%,transparent)] p-3">
        <div className="mb-1 text-xs font-medium text-agent-accent-foreground">
          Calling tool
        </div>
        <div className="font-mono text-sm text-foreground">{d.toolName ?? ""}</div>
        {d.thinking && (
          <div className="mt-2 text-sm text-muted-foreground">
            <AgentCardBody text={d.thinking} />
          </div>
        )}
      </div>
    );
  }

  if (event.type === "tool-result") {
    const d = event.data as { result?: { success?: boolean; error?: string } };
    const success = d.result?.success ?? false;
    return (
      <div
        className={`rounded-lg border p-3 ${
          success
            ? "border-green-500/30 bg-green-500/10"
            : "border-destructive/40 bg-destructive/10"
        }`}
      >
        <div
          className={`mb-1 text-xs font-medium ${
            success ? "text-green-600 dark:text-green-400" : "text-destructive"
          }`}
        >
          {success ? "Success" : "Failed"}
        </div>
        <div className="text-sm text-foreground">
          {success ? (
            "Tool executed successfully"
          ) : (
            <AgentCardBody text={d.result?.error ?? "Unknown error"} />
          )}
        </div>
      </div>
    );
  }

  if (event.type === "agent-complete") {
    const d = event.data as { message?: string };
    return (
      <div className="rounded-lg border border-agent-accent/40 bg-[color-mix(in_oklch,var(--agent-accent)_12%,transparent)] p-3">
        <div className="mb-1 text-xs font-medium text-agent-accent-foreground">
          Task complete
        </div>
        <div className="text-sm text-foreground">
          <AgentCardBody text={d.message ?? "Done."} />
        </div>
      </div>
    );
  }

  if (event.type === "error") {
    const d = event.data as { message?: string; code?: string };
    const isApiKeyInvalid = d.code === API_KEY_INVALID_CODE;
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
        <div className="mb-1 text-xs font-medium text-destructive">
          Error
        </div>
        <div className="text-sm text-foreground">
          <AgentCardBody text={d.message ?? "Unknown error"} />
        </div>
        {isApiKeyInvalid && (
          <Link href="/settings" className="mt-2 inline-block">
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Settings className="size-3.5" />
              Open Settings
            </Button>
          </Link>
        )}
      </div>
    );
  }

  if (event.type === "agent-timeout") {
    const d = event.data as { message?: string };
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          Timeout
        </div>
        <div className="text-sm text-foreground">
          <AgentCardBody text={d.message ?? "Maximum iterations reached."} />
        </div>
      </div>
    );
  }

  return null;
}

export function AgentPanel() {
  const view = useWorkspaceStore((s) => s.view);
  const isExecuting = useAgentStore((s) => s.isExecuting);
  const executionHistory = useAgentStore((s) => s.executionHistory);
  const streamingThinking = useAgentStore((s) => s.streamingThinking);
  const agentPanelOpen = useAgentStore((s) => s.agentPanelOpen);
  const toggleAgentPanel = useAgentStore((s) => s.toggleAgentPanel);

  const showPanel = agentPanelOpen;

  if (view === "agent") {
    return null;
  }

  if (!showPanel) {
    return (
      <button
        type="button"
        onClick={toggleAgentPanel}
        className="fixed bottom-4 right-4 z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg transition hover:opacity-90"
      >
        {isExecuting ? "Agent working…" : "Agent"}
      </button>
    );
  }

  const panelContent = (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
        <h3 className="font-semibold text-foreground">AI Agent</h3>
        <button
          type="button"
          onClick={toggleAgentPanel}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          &#215;
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {executionHistory.map((event, idx) => (
          <AgentEventCard key={idx} event={event} />
        ))}
        {isExecuting && streamingThinking && (
          <div className="animate-pulse rounded-lg border border-agent-accent/30 bg-[color-mix(in_oklch,var(--agent-accent)_8%,transparent)] p-3">
            <div className="mb-1 text-xs text-agent-accent-foreground">Thinking…</div>
            <div className="text-sm text-foreground">
              <MarkdownContent content={streamingThinking} />
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-h-[600px] w-96 flex-col rounded-lg border border-border bg-card shadow-2xl">
      {panelContent}
    </div>
  );
}
