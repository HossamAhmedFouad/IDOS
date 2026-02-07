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

  startExecution: (intent: string) => void;
  addEvent: (event: AgentEvent) => void;
  completeExecution: () => void;
  toggleAgentPanel: () => void;
  setThinking: (thinking: string) => void;
  openAgentRunDialog: () => void;
  closeAgentRunDialog: () => void;
  setHomeAgentMode: (v: boolean) => void;
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

  startExecution: (intent) =>
    set({
      isExecuting: true,
      currentIntent: intent,
      executionHistory: [],
      lastToolCall: null,
      agentPanelOpen: true,
    }),

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
}));
