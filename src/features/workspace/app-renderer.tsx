"use client";

import { AnimatePresence } from "framer-motion";
import type { SystemMode } from "@/lib/types";
import type { LayoutResult } from "./layout-engine";
import { getAppComponent } from "@/apps/registry";
import { AppWindow } from "@/components/app-window";
import { getAppName } from "@/lib/constants/app-catalog";
import { useWorkspaceStore } from "@/store/use-workspace-store";

interface AppRendererProps {
  layoutResult: LayoutResult;
  activeModes: SystemMode[];
}

export function AppRenderer({ layoutResult, activeModes }: AppRendererProps) {
  const minimizedAppIds = useWorkspaceStore((s) => s.minimizedAppIds);
  const allApps = layoutResult.apps;
  const visibleApps = allApps.filter((app) => !minimizedAppIds.includes(app.id));
  const showMinimize = allApps.length > 1;

  return (
    <AnimatePresence initial={false}>
      {visibleApps.map((app) => {
        const Component = getAppComponent(app.type);
        const title = getAppName(app.type);
        const appProps = {
          id: app.id,
          appType: app.type,
          position: { x: app.x, y: app.y },
          dimensions: { width: app.width, height: app.height },
          activeModes,
          config: app.config,
        };
        return (
          <AppWindow
            key={app.id}
            appId={app.id}
            appType={app.type}
            title={title}
            x={app.x}
            y={app.y}
            width={app.width}
            height={app.height}
            showMinimize={showMinimize}
          >
            <Component {...appProps} />
          </AppWindow>
        );
      })}
    </AnimatePresence>
  );
}
