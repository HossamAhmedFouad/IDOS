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
  /** Recent note paths from this agent session (used by Notes preview when workspace has no Notes app). */
  agentRecentNotePaths: string[];
  /** Content written by agent to a note - Notes app syncs this to display. Cleared after consumption. */
  agentNoteContent: { path: string; content: string } | null;
  /** Last code editor file path written by agent (so Code Editor preview can open it). */
  lastCodeEditorFilePath: string | null;
  /** Recent code editor paths from this agent session (used by Code Editor preview when workspace has no Code Editor app). */
  agentRecentCodeEditorPaths: string[];

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
  /** Add a path to agent recent notes (MRU, max 20). Used when agent creates/appends and preview has no workspace Notes app. */
  addPathToAgentRecentNotePaths: (path: string) => void;
  /** Clear agent recent note paths (e.g. when starting a new agent task). */
  clearAgentRecentNotePaths: () => void;
  setAgentNoteContent: (payload: { path: string; content: string } | null) => void;
  setLastCodeEditorFilePath: (path: string | null) => void;
  /** Add a path to agent recent code editor paths (MRU, max 20). Used when agent writes and preview has no workspace Code Editor app. */
  addPathToAgentRecentCodeEditorPaths: (path: string) => void;
  /** Clear agent recent code editor paths (e.g. when starting a new agent task). */
  clearAgentRecentCodeEditorPaths: () => void;
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
  agentRecentNotePaths: [],
  agentNoteContent: null,
  lastCodeEditorFilePath: null,
  agentRecentCodeEditorPaths: [],

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
  addPathToAgentRecentNotePaths: (path) =>
    set((s) => {
      const rest = s.agentRecentNotePaths.filter((p) => p !== path);
      return { agentRecentNotePaths: [path, ...rest].slice(0, 20) };
    }),
  clearAgentRecentNotePaths: () => set({ agentRecentNotePaths: [] }),
  setAgentNoteContent: (payload) => set({ agentNoteContent: payload }),
  setLastCodeEditorFilePath: (path) => set({ lastCodeEditorFilePath: path }),
  addPathToAgentRecentCodeEditorPaths: (path) =>
    set((s) => {
      const rest = s.agentRecentCodeEditorPaths.filter((p) => p !== path);
      return { agentRecentCodeEditorPaths: [path, ...rest].slice(0, 20) };
    }),
  clearAgentRecentCodeEditorPaths: () => set({ agentRecentCodeEditorPaths: [] }),
  incrementAgentDataVersion: () =>
    set((s) => ({ agentDataVersion: s.agentDataVersion + 1 })),
}));
