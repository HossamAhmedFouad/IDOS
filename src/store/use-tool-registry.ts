"use client";

import { create } from "zustand";
import type { AppTool, ToolDefinitionForAI } from "@/lib/types/agent";

interface ToolRegistryState {
  tools: Map<string, AppTool>;

  registerTool: (tool: AppTool) => void;
  unregisterTool: (toolName: string) => void;
  getToolsForApp: (appId: string) => AppTool[];
  getAllTools: () => AppTool[];
  getToolDefinitionsForAI: () => ToolDefinitionForAI[];
}

export const useToolRegistry = create<ToolRegistryState>((set, get) => ({
  tools: new Map(),

  registerTool: (tool) =>
    set((state) => {
      const newTools = new Map(state.tools);
      newTools.set(tool.name, tool);
      return { tools: newTools };
    }),

  unregisterTool: (toolName) =>
    set((state) => {
      const newTools = new Map(state.tools);
      newTools.delete(toolName);
      return { tools: newTools };
    }),

  getToolsForApp: (appId) => {
    return Array.from(get().tools.values()).filter((t) => t.appId === appId);
  },

  getAllTools: () => {
    return Array.from(get().tools.values());
  },

  getToolDefinitionsForAI: () => {
    return Array.from(get().tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      appId: tool.appId,
    }));
  },
}));
