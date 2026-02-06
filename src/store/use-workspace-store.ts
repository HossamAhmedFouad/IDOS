"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppInstance, AppId } from "@/lib/types";
import type { WorkspaceConfig } from "@/lib/types/workspace";
import type { LayoutStrategy } from "@/lib/types/layout";
import type { SystemMode } from "@/lib/types/modes";
import { APP_DEFAULT_SIZES } from "@/lib/constants/app-defaults";

const MAX_HISTORY = 10;

interface WorkspaceState {
  workspace: WorkspaceConfig;
  history: WorkspaceConfig[];
  activeModes: SystemMode[];

  setWorkspace: (config: WorkspaceConfig) => void;
  updateAppPosition: (appId: string, x: number, y: number) => void;
  updateAppSize: (appId: string, width: number, height: number, x?: number, y?: number) => void;
  addApp: (type: AppId, config?: AppInstance["config"]) => void;
  removeApp: (appId: string) => void;
  setLayoutStrategy: (strategy: LayoutStrategy) => void;
  setActiveModes: (modes: SystemMode[]) => void;
  pushHistory: (config: WorkspaceConfig) => void;
  recallFromHistory: (index: number) => void;
}

function generateAppId(): string {
  return `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const defaultWorkspace: WorkspaceConfig = {
  apps: [],
  layoutStrategy: "floating",
  modes: [],
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspace: defaultWorkspace,
      history: [],
      activeModes: [],

      setWorkspace: (config) =>
        set((state) => ({
          workspace: config,
          activeModes: config.modes,
        })),

      updateAppPosition: (appId, x, y) =>
        set((state) => ({
          workspace: {
            ...state.workspace,
            apps: state.workspace.apps.map((app) =>
              app.id === appId ? { ...app, x, y } : app
            ),
          },
        })),

      updateAppSize: (appId, width, height, x, y) =>
        set((state) => {
          const updates: Partial<AppInstance> = { width, height };
          if (x !== undefined) updates.x = x;
          if (y !== undefined) updates.y = y;
          return {
            workspace: {
              ...state.workspace,
              apps: state.workspace.apps.map((app) =>
                app.id === appId ? { ...app, ...updates } : app
              ),
            },
          };
        }),

      addApp: (type, config) =>
        set((state) => {
          const defaults = APP_DEFAULT_SIZES[type];
          const newApp: AppInstance = {
            id: generateAppId(),
            type,
            x: 50 + state.workspace.apps.length * 30,
            y: 50 + state.workspace.apps.length * 30,
            width: defaults.width,
            height: defaults.height,
            config,
          };
          return {
            workspace: {
              ...state.workspace,
              apps: [...state.workspace.apps, newApp],
            },
          };
        }),

      removeApp: (appId) =>
        set((state) => ({
          workspace: {
            ...state.workspace,
            apps: state.workspace.apps.filter((app) => app.id !== appId),
          },
        })),

      setLayoutStrategy: (strategy) =>
        set((state) => ({
          workspace: { ...state.workspace, layoutStrategy: strategy },
        })),

      setActiveModes: (modes) => set({ activeModes: modes }),

      pushHistory: (config) =>
        set((state) => {
          const history = [config, ...state.history].slice(0, MAX_HISTORY);
          return { history };
        }),

      recallFromHistory: (index) =>
        set((state) => {
          const config = state.history[index];
          if (!config) return state;
          return {
            workspace: config,
            activeModes: config.modes,
          };
        }),
    }),
    {
      name: "idos-workspace",
      partialize: (state) => ({
        workspace: state.workspace,
        history: state.history,
        activeModes: state.activeModes,
      }),
    }
  )
);
