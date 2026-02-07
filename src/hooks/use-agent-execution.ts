"use client";

import { useCallback } from "react";
import { useToolRegistry } from "@/store/use-tool-registry";
import { useAgentStore } from "@/store/use-agent-store";
import { useAgentSessionsStore } from "@/store/use-agent-sessions-store";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import type { AgentEvent, ToolResult } from "@/lib/types/agent";
import type { AgentSessionStatus } from "@/lib/types/agent";

const MAX_RESULT_SIZE = 12000;

function sanitizeToolResultForAI(result: ToolResult): ToolResult {
  if (result.data === undefined) return result;
  const str = JSON.stringify(result.data);
  if (str.length <= MAX_RESULT_SIZE) return result;
  return {
    ...result,
    data: {
      _truncated: true,
      _originalLength: str.length,
      summary: str.slice(0, 500) + "...[truncated]",
    },
  };
}

async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: string, data: unknown) => void
) {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      let eventType = "";
      let dataStr = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) eventType = line.slice(7).trim();
        if (line.startsWith("data: ")) dataStr = line.slice(6);
      }
      if (eventType && dataStr) {
        try {
          const data = JSON.parse(dataStr);
          onEvent(eventType, data);
        } catch {
          onEvent(eventType, { raw: dataStr });
        }
      }
    }
  }
}

function eventTypeToStatus(eventType: string): AgentSessionStatus {
  if (eventType === "agent-complete") return "completed";
  if (eventType === "agent-timeout") return "timeout";
  if (eventType === "error") return "error";
  return "completed";
}

export function useAgentExecution() {
  const getToolDefinitionsForAI = useToolRegistry((s) => s.getToolDefinitionsForAI);
  const getAllTools = useToolRegistry((s) => s.getAllTools);
  const startExecution = useAgentStore((s) => s.startExecution);
  const addEvent = useAgentStore((s) => s.addEvent);
  const completeExecution = useAgentStore((s) => s.completeExecution);
  const createSession = useAgentSessionsStore((s) => s.createSession);
  const updateSession = useAgentSessionsStore((s) => s.updateSession);
  const setView = useWorkspaceStore((s) => s.setView);

  const executeIntent = useCallback(
    async (intent: string) => {
      const toolDefinitions = getToolDefinitionsForAI();
      const tools = getAllTools();
      const toolsByName = new Map(tools.map((t) => [t.name, t]));

      const sessionId = createSession(intent);
      setView("agent");
      startExecution(intent);

      const addEventAndSync = (event: AgentEvent) => {
        addEvent(event);
        const history = useAgentStore.getState().executionHistory;
        updateSession(sessionId, { executionHistory: history });
      };

      const completeAndSync = (eventType: string) => {
        const history = useAgentStore.getState().executionHistory;
        updateSession(sessionId, {
          executionHistory: history,
          status: eventTypeToStatus(eventType),
        });
        completeExecution();
      };

      const runContinue = async (
        sessionId: string,
        toolName: string,
        toolResult: ToolResult
      ): Promise<void> => {
        const payload = sanitizeToolResultForAI(toolResult);
        const body = JSON.stringify({
          sessionId,
          toolName,
          toolResult: {
            success: payload.success,
            data: payload.data,
            error: payload.error,
          },
        });

        const doFetch = () =>
          fetch("/api/agent-execute/continue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });

        let res = await doFetch();
        if (!res.ok && res.status >= 500) {
          await new Promise((r) => setTimeout(r, 800));
          res = await doFetch();
        }
        if (!res.body) {
          addEventAndSync({
            type: "error",
            data: { message: res.ok ? "No response body" : `Request failed: ${res.status}` },
          });
          completeAndSync("error");
          return;
        }
        if (!res.ok) {
          addEventAndSync({ type: "error", data: { message: `Request failed: ${res.status}` } });
          completeAndSync("error");
          return;
        }

        await parseSSEStream(res.body.getReader(), (eventType, data) => {
          const event: AgentEvent = { type: eventType as AgentEvent["type"], data: data as Record<string, unknown> };
          addEventAndSync(event);

          if (eventType === "tool-call") {
            const d = data as { toolName?: string; args?: Record<string, unknown> };
            const name = d?.toolName;
            const args = d?.args ?? {};
            const tool = name ? toolsByName.get(name) : undefined;
            if (!name || !tool) {
              addEventAndSync({
                type: "error",
                data: { message: name ? `Tool not found: ${name}` : "Missing tool name" },
              });
              completeAndSync("error");
              return;
            }
            tool
              .execute(args as Record<string, unknown>)
              .then((result) => {
                addEventAndSync({
                  type: "tool-result",
                  data: { toolName: name, args, result, uiUpdate: result.uiUpdate },
                });
                runContinue(sessionId, name, result);
              })
              .catch((err) => {
                const message = err instanceof Error ? err.message : "Tool execution failed";
                addEventAndSync({ type: "error", data: { message, toolName: name } });
                completeAndSync("error");
              });
          } else if (
            eventType === "agent-complete" ||
            eventType === "agent-timeout" ||
            eventType === "error"
          ) {
            completeAndSync(eventType);
          }
        });
      };

      try {
        const res = await fetch("/api/agent-execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent,
            toolDefinitions,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          addEventAndSync({
            type: "error",
            data: { message: (err as { error?: string }).error ?? "Request failed" },
          });
          completeAndSync("error");
          return;
        }

        if (!res.body) {
          addEventAndSync({ type: "error", data: { message: "No response body" } });
          completeAndSync("error");
          return;
        }

        let apiSessionId = "";

        await parseSSEStream(res.body.getReader(), (eventType, data) => {
          const payload = data as Record<string, unknown>;
          if (eventType === "agent-start" && payload.sessionId) {
            apiSessionId = String(payload.sessionId);
          }

          const event: AgentEvent = { type: eventType as AgentEvent["type"], data: payload };
          addEventAndSync(event);

          if (eventType === "tool-call") {
            const name = payload?.toolName as string | undefined;
            const args = (payload?.args as Record<string, unknown>) ?? {};
            const tool = name ? toolsByName.get(name) : undefined;
            if (!name || !tool) {
              addEventAndSync({
                type: "error",
                data: { message: name ? `Tool not found: ${name}` : "Missing tool name" },
              });
              completeAndSync("error");
              return;
            }
            tool
              .execute(args)
              .then((result) => {
                addEventAndSync({
                  type: "tool-result",
                  data: { toolName: name, args, result, uiUpdate: result.uiUpdate },
                });
                runContinue(apiSessionId, name, result);
              })
              .catch((err) => {
                const message = err instanceof Error ? err.message : "Tool execution failed";
                addEventAndSync({ type: "error", data: { message, toolName: name } });
                completeAndSync("error");
              });
          } else if (
            eventType === "agent-complete" ||
            eventType === "agent-timeout" ||
            eventType === "error"
          ) {
            completeAndSync(eventType);
          }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error";
        addEventAndSync({ type: "error", data: { message } });
        completeAndSync("error");
      }
    },
    [
      getToolDefinitionsForAI,
      getAllTools,
      startExecution,
      addEvent,
      completeExecution,
      createSession,
      updateSession,
      setView,
    ]
  );

  const isExecuting = useAgentStore((s) => s.isExecuting);
  const events = useAgentStore((s) => s.executionHistory);

  return { isExecuting, events, executeIntent };
}
