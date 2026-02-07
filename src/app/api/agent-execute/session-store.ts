import type { ChatSession } from "@google/generative-ai";

export const agentSessions = new Map<
  string,
  { chat: ChatSession; createdAt: number }
>();

export const SESSION_TTL_MS = 5 * 60 * 1000;

export function cleanupSessions() {
  const now = Date.now();
  for (const [id, entry] of agentSessions.entries()) {
    if (now - entry.createdAt > SESSION_TTL_MS) agentSessions.delete(id);
  }
}
