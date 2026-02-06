"use client";

import type { SystemMode } from "@/lib/types";
import type { LayoutResult } from "./layout-engine";
import { getAppComponent } from "@/apps/registry";
import { AppWindow } from "@/components/app-window";
import { getAppName } from "@/lib/constants/app-catalog";

interface AppRendererProps {
  layoutResult: LayoutResult;
  activeModes: SystemMode[];
}

export function AppRenderer({ layoutResult, activeModes }: AppRendererProps) {
  const apps = layoutResult.apps;

  return (
    <>
      {apps.map((app) => {
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
            title={title}
            x={app.x}
            y={app.y}
            width={app.width}
            height={app.height}
          >
            <Component {...appProps} />
          </AppWindow>
        );
      })}
    </>
  );
}
