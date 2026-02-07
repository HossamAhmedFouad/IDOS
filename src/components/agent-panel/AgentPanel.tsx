"use client";

import { useAgentStore } from "@/store/use-agent-store";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import type { AgentEvent } from "@/lib/types/agent";

export function AgentEventCard({ event }: { event: AgentEvent }) {
  if (event.type === "agent-start") {
    return null;
  }

  if (event.type === "tool-call") {
    const d = event.data as { toolName?: string; thinking?: string };
    return (
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950/30">
        <div className="mb-1 text-xs font-medium text-purple-600 dark:text-purple-400">
          Calling tool
        </div>
        <div className="font-mono text-sm text-foreground">{d.toolName ?? ""}</div>
        {d.thinking && (
          <div className="mt-1 text-xs text-muted-foreground">{d.thinking}</div>
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
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
        }`}
      >
        <div
          className={`mb-1 text-xs font-medium ${
            success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {success ? "Success" : "Failed"}
        </div>
        <div className="text-sm text-foreground">
          {success ? "Tool executed successfully" : (d.result?.error ?? "Unknown error")}
        </div>
      </div>
    );
  }

  if (event.type === "agent-complete") {
    const d = event.data as { message?: string };
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
        <div className="mb-1 text-xs font-medium text-blue-600 dark:text-blue-400">
          Task complete
        </div>
        <div className="text-sm text-foreground">{d.message ?? "Done."}</div>
      </div>
    );
  }

  if (event.type === "error") {
    const d = event.data as { message?: string };
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
        <div className="mb-1 text-xs font-medium text-red-600 dark:text-red-400">
          Error
        </div>
        <div className="text-sm text-foreground">{d.message ?? "Unknown error"}</div>
      </div>
    );
  }

  if (event.type === "agent-timeout") {
    const d = event.data as { message?: string };
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
        <div className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          Timeout
        </div>
        <div className="text-sm text-foreground">{d.message ?? "Maximum iterations reached."}</div>
      </div>
    );
  }

  return null;
}

export function AgentPanel() {
  const view = useWorkspaceStore((s) => s.view);
  const isExecuting = useAgentStore((s) => s.isExecuting);
  const currentIntent = useAgentStore((s) => s.currentIntent);
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
        {currentIntent && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <div className="mb-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              Intent
            </div>
            <div className="text-sm text-foreground">{currentIntent}</div>
          </div>
        )}
        {executionHistory.map((event, idx) => (
          <AgentEventCard key={idx} event={event} />
        ))}
        {isExecuting && streamingThinking && (
          <div className="animate-pulse rounded-lg border border-border bg-muted/50 p-3">
            <div className="mb-1 text-xs text-muted-foreground">Thinking…</div>
            <div className="text-sm text-foreground">{streamingThinking}</div>
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
