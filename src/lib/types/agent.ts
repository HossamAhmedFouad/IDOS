/**
 * Agent control types: tool definitions, results, and execution events.
 */

import type { AppSpecificUIUpdate } from "./uiUpdates";

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  uiUpdate?: AppSpecificUIUpdate;
  multipleUpdates?: AppSpecificUIUpdate[];
}

export interface AppToolParameters {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }
  >;
  required: string[];
}

export interface AppTool {
  name: string;
  description: string;
  appId: string;
  parameters: AppToolParameters;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

/** Serializable tool definition sent to the API (no execute). */
export interface ToolDefinitionForAI {
  name: string;
  description: string;
  parameters: AppToolParameters;
  appId: string;
}

export type AgentEventType =
  | "agent-start"
  | "tool-call"
  | "tool-result"
  | "agent-complete"
  | "error"
  | "agent-timeout";

export interface AgentEvent {
  type: AgentEventType;
  data: Record<string, unknown>;
}

export type AgentSessionStatus = "running" | "completed" | "error" | "timeout";

export interface AgentSession {
  id: string;
  intent: string;
  label?: string;
  executionHistory: AgentEvent[];
  status: AgentSessionStatus;
  createdAt: number;
  lastAccessedAt?: number;
  isFavorite?: boolean;
}
