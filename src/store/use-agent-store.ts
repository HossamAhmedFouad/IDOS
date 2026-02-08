"use client";

import { create } from "zustand";
import type { AgentEvent } from "@/lib/types/agent";

interface LastToolCall {
  toolName: string;
  args: unknown;
  result: unknown;
  timestamp: number;
}

interface AgentState {
  isExecuting: boolean;
  currentIntent: string | null;
  executionHistory: AgentEvent[];
  lastToolCall: LastToolCall | null;
  agentPanelOpen: boolean;
  streamingThinking: string;
  agentRunDialogOpen: boolean;
  /** On home screen: true = agent mode (intent runs agent, bottom-half panel visible). */
  homeAgentMode: boolean;
  /** Bumped on each tool-result so file-based apps can refetch when on Agent view. */
  agentDataVersion: number;
  /** Last note path created by agent (so Notes app in agent preview can load it when navigating back). */
  lastCreatedNotePath: string | null;
  /** Content written by agent to a note - Notes app syncs this to display. Cleared after consumption. */
  agentNoteContent: { path: string; content: string } | null;

  startExecution: (intent: string) => void;
  /** Seed execution history (e.g. when continuing in same session). Call after startExecution. */
  setExecutionHistory: (events: AgentEvent[]) => void;
  addEvent: (event: AgentEvent) => void;
  completeExecution: () => void;
  toggleAgentPanel: () => void;
  setThinking: (thinking: string) => void;
  openAgentRunDialog: () => void;
  closeAgentRunDialog: () => void;
  setHomeAgentMode: (v: boolean) => void;
  setLastCreatedNotePath: (path: string | null) => void;
  setAgentNoteContent: (payload: { path: string; content: string } | null) => void;
  /** Bump agentDataVersion so file-based apps (e.g. whiteboard) refetch. */
  incrementAgentDataVersion: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  isExecuting: false,
  currentIntent: null,
  executionHistory: [],
  lastToolCall: null,
  agentPanelOpen: false,
  streamingThinking: "",
  agentRunDialogOpen: false,
  homeAgentMode: false,
  agentDataVersion: 0,
  lastCreatedNotePath: null,
  agentNoteContent: null,

  startExecution: (intent) =>
    set({
      isExecuting: true,
      currentIntent: intent,
      executionHistory: [],
      lastToolCall: null,
      agentPanelOpen: true,
    }),

  setExecutionHistory: (events) =>
    set({ executionHistory: Array.isArray(events) ? [...events] : [] }),

  addEvent: (event) =>
    set((state) => ({
      executionHistory: [...state.executionHistory, event],
      lastToolCall:
        event.type === "tool-result" && event.data
          ? {
              toolName: (event.data.toolName as string) ?? "",
              args: event.data.args,
              result: event.data.result,
              timestamp: Date.now(),
            }
          : state.lastToolCall,
      agentDataVersion:
        event.type === "tool-result" ? state.agentDataVersion + 1 : state.agentDataVersion,
    })),

  completeExecution: () =>
    set({
      isExecuting: false,
      currentIntent: null,
      streamingThinking: "",
    }),

  toggleAgentPanel: () =>
    set((state) => ({ agentPanelOpen: !state.agentPanelOpen })),

  setThinking: (thinking) => set({ streamingThinking: thinking }),

  openAgentRunDialog: () => set({ agentRunDialogOpen: true }),
  closeAgentRunDialog: () => set({ agentRunDialogOpen: false }),
  setHomeAgentMode: (v) => set({ homeAgentMode: v }),
  setLastCreatedNotePath: (path) => set({ lastCreatedNotePath: path }),
  setAgentNoteContent: (payload) => set({ agentNoteContent: payload }),
  incrementAgentDataVersion: () =>
    set((s) => ({ agentDataVersion: s.agentDataVersion + 1 })),
}));
