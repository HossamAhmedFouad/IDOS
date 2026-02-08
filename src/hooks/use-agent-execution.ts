"use client";

import { useCallback } from "react";
import { useToolRegistry } from "@/store/use-tool-registry";
import { useAgentStore } from "@/store/use-agent-store";
import { useAgentSessionsStore } from "@/store/use-agent-sessions-store";
import {
  useWorkspaceStore,
  selectActiveWorkspaceConfig,
} from "@/store/use-workspace-store";
import { uiUpdateExecutor } from "@/lib/uiUpdateExecutor";
import { clearWhiteboardForNewRun } from "@/apps/whiteboard/tools";
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

/** When the agent creates a note, ensure the Notes app has that file path so it loads when shown (workspace + agent store for preview). */
function syncCreatedNotePathToWorkspace(toolName: string, result: ToolResult): void {
  if (toolName !== "notes_create_note" || !result.success || !result.data) return;
  const data = result.data as { path?: string };
  const path = typeof data.path === "string" ? data.path : undefined;
  if (!path) return;
  useAgentStore.getState().setLastCreatedNotePath(path);
  const state = useWorkspaceStore.getState();
  const config = selectActiveWorkspaceConfig(state);
  const notesApp = config.apps.find((a) => a.type === "notes");
  if (notesApp) {
    state.updateAppConfig(notesApp.id, { filePath: path });
  } else if (state.view !== "agent") {
    // In Agent view, don't add a new app — it would spawn a floating window that blocks the UI. The left pane shows a preview instead.
    state.addApp("notes", { filePath: path });
  }
}

/** Sync agent-written note content to the store so the Notes app can display it (avoids React controlled-component overwriting typewriter). */
function syncAgentNoteContent(toolName: string, result: ToolResult, args: Record<string, unknown>): void {
  if (toolName !== "notes_create_note" || !result.success || !result.data) return;
  const data = result.data as { path?: string };
  const path = typeof data.path === "string" ? data.path : undefined;
  if (!path) return;
  const content = String(args.content ?? "").trim();
  useAgentStore.getState().setAgentNoteContent({ path, content });
}

export function useAgentExecution() {
  const getToolDefinitionsForAI = useToolRegistry((s) => s.getToolDefinitionsForAI);
  const getTool = useToolRegistry((s) => s.getTool);
  const startExecution = useAgentStore((s) => s.startExecution);
  const setExecutionHistory = useAgentStore((s) => s.setExecutionHistory);
  const incrementAgentDataVersion = useAgentStore((s) => s.incrementAgentDataVersion);
  const addEvent = useAgentStore((s) => s.addEvent);
  const completeExecution = useAgentStore((s) => s.completeExecution);
  const createSession = useAgentSessionsStore((s) => s.createSession);
  const updateSession = useAgentSessionsStore((s) => s.updateSession);
  const setView = useWorkspaceStore((s) => s.setView);

  const executeIntent = useCallback(
    async (intent: string, options?: { continueInSession?: boolean }) => {
      const toolDefinitions = getToolDefinitionsForAI();

      const sessionsState = useAgentSessionsStore.getState();
      const activeId = sessionsState.activeAgentSessionId;
      const existingSession =
        activeId != null
          ? sessionsState.agentSessions.find((s) => s.id === activeId)
          : undefined;
      const backendSessionId = existingSession?.backendSessionId;
      const continueInSession =
        options?.continueInSession === true && !!activeId && !!backendSessionId;

      const sessionId = continueInSession ? activeId! : createSession(intent);
      setView("agent");
      startExecution(intent);
      if (continueInSession && existingSession?.executionHistory?.length) {
        setExecutionHistory(existingSession.executionHistory);
      }
      if (!continueInSession) {
        // Clear whiteboard so new agent runs start with empty canvas
        clearWhiteboardForNewRun().then(() => incrementAgentDataVersion());
      }

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
          const err = await res.json().catch(() => ({ error: `Request failed: ${res.status}` }));
          const message =
            (err as { error?: string }).error ?? `Request failed: ${res.status}`;
          addEventAndSync({ type: "error", data: { message } });
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
            const tool = name ? getTool(name) : undefined;
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
                if (result.uiUpdate) void uiUpdateExecutor.execute(result.uiUpdate);
                if (result.multipleUpdates?.length)
                  void uiUpdateExecutor.executeMultiple(result.multipleUpdates);
                syncCreatedNotePathToWorkspace(name, result);
                syncAgentNoteContent(name, result, args as Record<string, unknown>);
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
        const res = await (continueInSession
          ? fetch("/api/agent-execute/follow-up", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: backendSessionId,
                intent,
              }),
            })
          : fetch("/api/agent-execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                intent,
                toolDefinitions,
                sessionId,
              }),
            }));

        if (!res.ok) {
          if (res.status === 404 && continueInSession) {
            updateSession(sessionId, { backendSessionId: undefined });
          }
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
            updateSession(sessionId, { backendSessionId: apiSessionId });
          }

          const event: AgentEvent = { type: eventType as AgentEvent["type"], data: payload };
          addEventAndSync(event);

          if (eventType === "tool-call") {
            const name = payload?.toolName as string | undefined;
            const args = (payload?.args as Record<string, unknown>) ?? {};
            const tool = name ? getTool(name) : undefined;
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
                if (result.uiUpdate) void uiUpdateExecutor.execute(result.uiUpdate);
                if (result.multipleUpdates?.length)
                  void uiUpdateExecutor.executeMultiple(result.multipleUpdates);
                syncCreatedNotePathToWorkspace(name, result);
                syncAgentNoteContent(name, result, args);
                if (!apiSessionId) {
                  addEventAndSync({
                    type: "error",
                    data: { message: "Missing session from server; please try again." },
                  });
                  completeAndSync("error");
                  return;
                }
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
      getTool,
      startExecution,
      setExecutionHistory,
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
