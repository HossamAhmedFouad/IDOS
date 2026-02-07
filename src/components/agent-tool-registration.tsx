"use client";

import { useEffect, useMemo } from "react";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useToolRegistry } from "@/store/use-tool-registry";
import { createNotesTools } from "@/apps/notes/tools";
import { createTodoTools } from "@/apps/todo/tools";
import { calendarTools } from "@/apps/calendar/tools";
import { fileBrowserTools } from "@/apps/file-browser/tools";

/**
 * Placeholder app instance id used when registering tools for the agent
 * when no workspace app window is open. UI updates (e.g. scroll, flash) will
 * no-op if the target element is not in the DOM.
 */
const AGENT_PLACEHOLDER_ID = "agent-placeholder";

/**
 * Registers all app tools (notes, todo, calendar, file-browser) when on Home
 * or Agent view so the agent can use them even when no app windows are mounted.
 * On Workspace view we unregister so that open apps can register with their
 * real instance ids; when switching back to Home/Agent we re-register placeholders.
 */
export function AgentToolRegistration() {
  const view = useWorkspaceStore((s) => s.view);
  const registerTool = useToolRegistry((s) => s.registerTool);
  const unregisterTool = useToolRegistry((s) => s.unregisterTool);

  const tools = useMemo(() => {
    const notes = createNotesTools(AGENT_PLACEHOLDER_ID);
    const todo = createTodoTools(AGENT_PLACEHOLDER_ID);
    return [...notes, ...todo, ...calendarTools, ...fileBrowserTools];
  }, []);

  useEffect(() => {
    if (view === "home" || view === "agent") {
      tools.forEach((tool) => registerTool(tool));
      return () => {
        tools.forEach((tool) => unregisterTool(tool.name));
      };
    }
  }, [view, tools, registerTool, unregisterTool]);

  return null;
}
