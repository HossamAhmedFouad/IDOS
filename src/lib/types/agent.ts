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

/** JSON Schema-like property descriptor for tool parameters (supports nested objects in array items). */
export interface ToolParameterProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string } | { type: string; properties?: Record<string, ToolParameterProperty>; required?: string[] };
}

export interface AppToolParameters {
  type: "object";
  properties: Record<string, ToolParameterProperty>;
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

/** File attached to an agent run for context (path + content sent to API). */
export interface AttachedFile {
  path: string;
  content: string;
}

export type AgentEventType =
  | "agent-start"
  | "user-message"
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
  /** Backend chat session id (server-side); used for follow-up messages in same chat. Not persisted. */
  backendSessionId?: string;
}
