"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppInstance, AppId } from "@/lib/types";
import type { WorkspaceConfig, Workspace } from "@/lib/types/workspace";
import type { LayoutStrategy } from "@/lib/types/layout";
import type { SystemMode } from "@/lib/types/modes";
import { APP_DEFAULT_SIZES } from "@/lib/constants/app-defaults";

const WORKSPACE_LABEL_MAX_LEN = 40;

export type AppView = "home" | "workspace";

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  minimizedByWorkspace: Record<string, string[]>;
  activeModes: SystemMode[];
  view: AppView;
  snapToGrid: boolean;

  setView: (view: AppView) => void;
  setSnapToGrid: (enabled: boolean) => void;
  createWorkspace: (config: WorkspaceConfig, label?: string) => void;
  setActiveWorkspace: (id: string | null) => void;
  removeWorkspace: (id: string) => void;
  updateWorkspaceLabel: (workspaceId: string, label: string) => void;
  updateActiveWorkspaceConfig: (config: WorkspaceConfig) => void;
  updateAppPosition: (appId: string, x: number, y: number) => void;
  updateAppSize: (appId: string, width: number, height: number, x?: number, y?: number) => void;
  updateAppConfig: (appId: string, partialConfig: Partial<AppInstance["config"]>) => void;
  addApp: (type: AppId, config?: AppInstance["config"]) => void;
  removeApp: (appId: string) => void;
  setMinimized: (appId: string, minimized: boolean) => void;
  setLayoutStrategy: (strategy: LayoutStrategy) => void;
  setActiveModes: (modes: SystemMode[]) => void;
  setWorkspaceFavorite: (workspaceId: string, isFavorite: boolean) => void;
}

function generateAppId(): string {
  return `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateWorkspaceId(): string {
  return `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const defaultWorkspaceConfig: WorkspaceConfig = {
  apps: [],
  layoutStrategy: "floating",
  modes: [],
};

function getActiveWorkspace(state: WorkspaceState): Workspace | undefined {
  if (!state.activeWorkspaceId) return undefined;
  return state.workspaces.find((w) => w.id === state.activeWorkspaceId);
}

/** Selector helper: get active workspace config or default. Use in components. */
export function selectActiveWorkspaceConfig(state: WorkspaceState): WorkspaceConfig {
  const w = getActiveWorkspace(state);
  return w?.config ?? defaultWorkspaceConfig;
}

/** Stable empty array for selectors to avoid new references (fixes getServerSnapshot loop). */
const EMPTY_MINIMIZED_IDS: string[] = [];

/** Selector helper: get minimized app ids for the active workspace. */
export function selectMinimizedAppIds(state: WorkspaceState): string[] {
  if (!state.activeWorkspaceId) return EMPTY_MINIMIZED_IDS;
  const ids = state.minimizedByWorkspace[state.activeWorkspaceId];
  return ids ?? EMPTY_MINIMIZED_IDS;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      minimizedByWorkspace: {},
      activeModes: ["dark"],
      view: "home",
      snapToGrid: false,

      setView: (view) => set({ view }),
      setSnapToGrid: (enabled) => set({ snapToGrid: enabled }),

      createWorkspace: (config, label) =>
        set((state) => {
          const id = generateWorkspaceId();
          const truncatedLabel =
            label != null && label.trim()
              ? label.trim().slice(0, WORKSPACE_LABEL_MAX_LEN)
              : undefined;
          const workspace: Workspace = {
            id,
            label: truncatedLabel,
            config,
            lastAccessedAt: Date.now(),
          };
          return {
            workspaces: [...state.workspaces, workspace],
            activeWorkspaceId: id,
            activeModes: config.modes,
            minimizedByWorkspace: {
              ...state.minimizedByWorkspace,
              [id]: [],
            },
          };
        }),

      setActiveWorkspace: (id) =>
        set((state) => {
          if (id === null) return { activeWorkspaceId: null };
          const exists = state.workspaces.some((w) => w.id === id);
          if (!exists) return state;
          const workspace = state.workspaces.find((w) => w.id === id);
          return {
            activeWorkspaceId: id,
            activeModes: workspace?.config.modes ?? state.activeModes,
          };
        }),

      setWorkspaceFavorite: (workspaceId, isFavorite) =>
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId ? { ...w, isFavorite } : w
          ),
        })),

      removeWorkspace: (id) =>
        set((state) => {
          const nextWorkspaces = state.workspaces.filter((w) => w.id !== id);
          const nextMinimized = { ...state.minimizedByWorkspace };
          delete nextMinimized[id];
          let nextActiveId = state.activeWorkspaceId;
          if (state.activeWorkspaceId === id) {
            nextActiveId =
              nextWorkspaces.length > 0 ? nextWorkspaces[0].id : null;
          }
          return {
            workspaces: nextWorkspaces,
            activeWorkspaceId: nextActiveId,
            minimizedByWorkspace: nextMinimized,
          };
        }),

      updateWorkspaceLabel: (workspaceId, label) =>
        set((state) => {
          const trimmed = label.trim().slice(0, WORKSPACE_LABEL_MAX_LEN) || undefined;
          return {
            workspaces: state.workspaces.map((w) =>
              w.id === workspaceId ? { ...w, label: trimmed } : w
            ),
          };
        }),

      updateActiveWorkspaceConfig: (config) =>
        set((state) => {
          if (!state.activeWorkspaceId) return state;
          return {
            workspaces: state.workspaces.map((w) =>
              w.id === state.activeWorkspaceId
                ? { ...w, config }
                : w
            ),
            activeModes: config.modes,
          };
        }),

      setMinimized: (appId, minimized) =>
        set((state) => {
          if (!state.activeWorkspaceId) return state;
          const key = state.activeWorkspaceId;
          const current = state.minimizedByWorkspace[key] ?? [];
          const next = minimized
            ? [...current, appId]
            : current.filter((id) => id !== appId);
          return {
            minimizedByWorkspace: {
              ...state.minimizedByWorkspace,
              [key]: next,
            },
          };
        }),

      updateAppPosition: (appId, x, y) =>
        set((state) => {
          const active = getActiveWorkspace(state);
          if (!active) return state;
          return {
            workspaces: state.workspaces.map((w) =>
              w.id === active.id
                ? {
                    ...w,
                    config: {
                      ...w.config,
                      apps: w.config.apps.map((app) =>
                        app.id === appId ? { ...app, x, y } : app
                      ),
                    },
                  }
                : w
            ),
          };
        }),

      updateAppSize: (appId, width, height, x, y) =>
        set((state) => {
          const active = getActiveWorkspace(state);
          if (!active) return state;
          const updates: Partial<AppInstance> = { width, height };
          if (x !== undefined) updates.x = x;
          if (y !== undefined) updates.y = y;
          return {
            workspaces: state.workspaces.map((w) =>
              w.id === active.id
                ? {
                    ...w,
                    config: {
                      ...w.config,
                      apps: w.config.apps.map((app) =>
                        app.id === appId ? { ...app, ...updates } : app
                      ),
                    },
                  }
                : w
            ),
          };
        }),

      updateAppConfig: (appId, partialConfig) =>
        set((state) => {
          const active = getActiveWorkspace(state);
          if (!active) return state;
          return {
            workspaces: state.workspaces.map((w) =>
              w.id === active.id
                ? {
                    ...w,
                    config: {
                      ...w.config,
                      apps: w.config.apps.map((app) =>
                        app.id === appId
                          ? { ...app, config: { ...app.config, ...partialConfig } }
                          : app
                      ),
                    },
                  }
                : w
            ),
          };
        }),

      addApp: (type, config) =>
        set((state) => {
          const active = getActiveWorkspace(state);
          if (!active) return state;
          const defaults = APP_DEFAULT_SIZES[type];
          const appCount = active.config.apps.length;
          const newApp: AppInstance = {
            id: generateAppId(),
            type,
            x: 50 + appCount * 30,
            y: 50 + appCount * 30,
            width: defaults.width,
            height: defaults.height,
            config,
          };
          return {
            workspaces: state.workspaces.map((w) =>
              w.id === active.id
                ? {
                    ...w,
                    config: {
                      ...w.config,
                      apps: [...w.config.apps, newApp],
                    },
                  }
                : w
            ),
          };
        }),

      removeApp: (appId) =>
        set((state) => {
          const active = getActiveWorkspace(state);
          if (!active) return state;
          const key = active.id;
          return {
            workspaces: state.workspaces.map((w) =>
              w.id === active.id
                ? {
                    ...w,
                    config: {
                      ...w.config,
                      apps: w.config.apps.filter((app) => app.id !== appId),
                    },
                  }
                : w
            ),
            minimizedByWorkspace: {
              ...state.minimizedByWorkspace,
              [key]: (state.minimizedByWorkspace[key] ?? []).filter(
                (id) => id !== appId
              ),
            },
          };
        }),

      setLayoutStrategy: (strategy) =>
        set((state) => {
          const active = getActiveWorkspace(state);
          if (!active) return state;
          return {
            workspaces: state.workspaces.map((w) =>
              w.id === active.id
                ? { ...w, config: { ...w.config, layoutStrategy: strategy } }
                : w
            ),
          };
        }),

      setActiveModes: (modes) =>
        set({
          activeModes: modes.filter((m): m is SystemMode => m === "dark" || m === "dnd"),
        }),
    }),
    {
      name: "idos-workspace",
      version: 2,
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
        minimizedByWorkspace: state.minimizedByWorkspace,
        activeModes: state.activeModes,
        view: state.view,
        snapToGrid: state.snapToGrid,
      }),
      migrate: (persisted, version) => {
        const p = persisted as Record<string, unknown> | null;
        const hasOldShape =
          p &&
          typeof p === "object" &&
          "workspace" in p &&
          !("workspaces" in p);
        if (hasOldShape) {
          const old = p as {
            workspace?: WorkspaceConfig;
            history?: WorkspaceConfig[];
            activeModes?: SystemMode[];
            minimizedAppIds?: string[];
            view?: AppView;
          };
          const workspaces: Workspace[] = [];
          if (old.workspace && Object.keys(old.workspace).length > 0) {
            workspaces.push({
              id: generateWorkspaceId(),
              config: old.workspace,
              label: undefined,
            });
          }
          const fromHistory = (old.history ?? []).slice(0, 10);
          fromHistory.forEach((config) => {
            workspaces.push({
              id: generateWorkspaceId(),
              config,
              label: undefined,
            });
          });
          const firstId = workspaces[0]?.id ?? null;
          const minimizedByWorkspace: Record<string, string[]> = {};
          if (firstId && (old.minimizedAppIds ?? []).length > 0) {
            minimizedByWorkspace[firstId] = old.minimizedAppIds ?? [];
          }
          return {
            workspaces,
            activeWorkspaceId: firstId,
            minimizedByWorkspace,
            activeModes: old.activeModes ?? ["dark"],
            view: old.view ?? "home",
            snapToGrid: false,
          } as WorkspaceState;
        }
        const merged = persisted as Record<string, unknown>;
        const rawModes = (merged?.activeModes as SystemMode[] | undefined) ?? [];
        const activeModes = rawModes.filter((m): m is SystemMode => m === "dark" || m === "dnd");
        return {
          ...merged,
          activeModes,
          snapToGrid: merged?.snapToGrid ?? false,
        } as WorkspaceState;
      },
    }
  )
);
