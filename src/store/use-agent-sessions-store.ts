"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentSession } from "@/lib/types/agent";

const SESSION_LABEL_MAX_LEN = 40;
const MAX_SESSIONS = 50;

function generateSessionId(): string {
  return `agent-session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function truncateIntent(intent: string, maxLen: number): string {
  const trimmed = intent.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen) + "...";
}

interface AgentSessionsState {
  agentSessions: AgentSession[];
  activeAgentSessionId: string | null;

  createSession: (intent: string) => string;
  setActiveSession: (id: string | null) => void;
  updateSession: (
    id: string,
    partial: Partial<Pick<AgentSession, "executionHistory" | "status">>
  ) => void;
  removeSession: (id: string) => void;
  updateSessionLabel: (id: string, label: string) => void;
  setSessionFavorite: (id: string, isFavorite: boolean) => void;
}

function pruneSessions(sessions: AgentSession[]): AgentSession[] {
  if (sessions.length <= MAX_SESSIONS) return sessions;
  const sorted = [...sessions].sort((a, b) => {
    const aTime = a.lastAccessedAt ?? a.createdAt;
    const bTime = b.lastAccessedAt ?? b.createdAt;
    return aTime - bTime;
  });
  const toKeep = sorted.slice(-MAX_SESSIONS);
  return sessions.filter((s) => toKeep.some((k) => k.id === s.id));
}

export const useAgentSessionsStore = create<AgentSessionsState>()(
  persist(
    (set, get) => ({
      agentSessions: [],
      activeAgentSessionId: null,

      createSession: (intent: string) => {
        const id = generateSessionId();
        const truncatedLabel = truncateIntent(intent, SESSION_LABEL_MAX_LEN);
        const session: AgentSession = {
          id,
          intent,
          label: truncatedLabel || undefined,
          executionHistory: [],
          status: "running",
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        };
        set((state) => {
          const nextSessions = pruneSessions([...state.agentSessions, session]);
          return {
            agentSessions: nextSessions,
            activeAgentSessionId: id,
          };
        });
        return id;
      },

      setActiveSession: (id) =>
        set((state) => {
          if (id === null) return { activeAgentSessionId: null };
          const exists = state.agentSessions.some((s) => s.id === id);
          if (!exists) return state;
          const sessions = state.agentSessions.map((s) =>
            s.id === id ? { ...s, lastAccessedAt: Date.now() } : s
          );
          return {
            agentSessions: sessions,
            activeAgentSessionId: id,
          };
        }),

      updateSession: (id, partial) =>
        set((state) => {
          const sessions = state.agentSessions.map((s) =>
            s.id === id ? { ...s, ...partial, lastAccessedAt: Date.now() } : s
          );
          return { agentSessions: sessions };
        }),

      removeSession: (id) =>
        set((state) => {
          const nextSessions = state.agentSessions.filter((s) => s.id !== id);
          let nextActiveId = state.activeAgentSessionId;
          if (state.activeAgentSessionId === id) {
            nextActiveId =
              nextSessions.length > 0 ? nextSessions[nextSessions.length - 1].id : null;
          }
          return {
            agentSessions: nextSessions,
            activeAgentSessionId: nextActiveId,
          };
        }),

      updateSessionLabel: (id, label) =>
        set((state) => {
          const trimmed = label.trim().slice(0, SESSION_LABEL_MAX_LEN) || undefined;
          return {
            agentSessions: state.agentSessions.map((s) =>
              s.id === id ? { ...s, label: trimmed } : s
            ),
          };
        }),

      setSessionFavorite: (id, isFavorite) =>
        set((state) => ({
          agentSessions: state.agentSessions.map((s) =>
            s.id === id ? { ...s, isFavorite } : s
          ),
        })),
    }),
    {
      name: "idos-agent-sessions",
      version: 1,
      partialize: (state) => ({
        agentSessions: state.agentSessions,
        activeAgentSessionId: state.activeAgentSessionId,
      }),
    }
  )
);
