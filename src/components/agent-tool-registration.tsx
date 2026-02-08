"use client";

import { useEffect, useMemo } from "react";
import { useWorkspaceStore, selectActiveWorkspaceConfig } from "@/store/use-workspace-store";
import { useToolRegistry } from "@/store/use-tool-registry";
import { createNotesTools } from "@/apps/notes/tools";
import { createTodoTools } from "@/apps/todo/tools";
import { createCalendarTools } from "@/apps/calendar/tools";
import { createFileBrowserTools } from "@/apps/file-browser/tools";
import { createTimerTools } from "@/apps/timer/tools";
import { createCodeEditorTools } from "@/apps/code-editor/tools";
import { createEmailTools } from "@/apps/email/tools";
import { createWhiteboardTools } from "@/apps/whiteboard/tools";
import { createQuizTools } from "@/apps/quiz/tools";
import type { AppId } from "@/lib/types";

/**
 * Placeholder app instance id used when registering tools for the agent
 * when no workspace app window is open. UI updates (e.g. scroll, flash) will
 * no-op if the target element is not in the DOM.
 */
const AGENT_PLACEHOLDER_ID = "agent-placeholder";

/** Maps appId to its tools for placeholder registration. */
const APP_TOOL_SETS: { appId: AppId; createTools: (id: string) => ReturnType<typeof createNotesTools> }[] = [
  { appId: "notes", createTools: createNotesTools },
  { appId: "todo", createTools: createTodoTools },
  { appId: "calendar", createTools: createCalendarTools },
  { appId: "file-browser", createTools: createFileBrowserTools },
  { appId: "timer", createTools: createTimerTools },
  { appId: "code-editor", createTools: createCodeEditorTools },
  { appId: "email", createTools: createEmailTools },
  { appId: "whiteboard", createTools: createWhiteboardTools },
  { appId: "quiz", createTools: createQuizTools },
];

/**
 * Registers app tools for the agent. On Home/Agent view, registers all placeholders.
 * On Workspace view, registers placeholders only for apps NOT in the workspace
 * (open apps register with their real instance ids). This ensures the agent
 * always has access to all tools regardless of which apps are open.
 */
export function AgentToolRegistration() {
  const view = useWorkspaceStore((s) => s.view);
  const workspace = useWorkspaceStore(selectActiveWorkspaceConfig);
  const registerTool = useToolRegistry((s) => s.registerTool);
  const unregisterTool = useToolRegistry((s) => s.unregisterTool);

  const appTypesInWorkspace = useMemo(
    () => new Set((workspace.apps ?? []).map((a) => a.type)),
    [workspace.apps]
  );

  const toolsToRegister = useMemo(() => {
    if (view === "home" || view === "agent") {
      return APP_TOOL_SETS.flatMap(({ createTools }) => createTools(AGENT_PLACEHOLDER_ID));
    }
    if (view === "workspace") {
      return APP_TOOL_SETS
        .filter(({ appId }) => !appTypesInWorkspace.has(appId))
        .flatMap(({ createTools }) => createTools(AGENT_PLACEHOLDER_ID));
    }
    return [];
  }, [view, appTypesInWorkspace]);

  useEffect(() => {
    toolsToRegister.forEach((tool) => registerTool(tool));
    return () => {
      toolsToRegister.forEach((tool) => unregisterTool(tool.name));
    };
  }, [toolsToRegister, registerTool, unregisterTool]);

  return null;
}
