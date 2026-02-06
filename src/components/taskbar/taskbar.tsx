"use client";

import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { APP_CATALOG } from "@/lib/constants/app-catalog";
import { getAppIcon } from "@/lib/constants/app-icons";
import type { AppId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TASKBAR_HEIGHT = 56;

export function Taskbar() {
  const addApp = useWorkspaceStore((s) => s.addApp);
  const setMinimized = useWorkspaceStore((s) => s.setMinimized);
  const setView = useWorkspaceStore((s) => s.setView);
  const view = useWorkspaceStore((s) => s.view);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const minimizedAppIds = useWorkspaceStore((s) => s.minimizedAppIds);

  const openAppTypes = new Set(
    workspace.apps.filter((a) => !minimizedAppIds.includes(a.id)).map((a) => a.type)
  );

  const handleAppClick = (appId: AppId) => {
    const minimizedOfType = workspace.apps.filter(
      (a) => a.type === appId && minimizedAppIds.includes(a.id)
    );
    if (minimizedOfType.length > 0) {
      setMinimized(minimizedOfType[0].id, false);
    } else {
      addApp(appId);
    }
    if (view === "home") {
      setView("workspace");
    }
  };

  return (
    <motion.div
      initial={{ y: TASKBAR_HEIGHT }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-1 border-t border-border/80 bg-background/90 py-2 backdrop-blur-md"
      style={{ height: TASKBAR_HEIGHT }}
    >
      <div className="flex items-center gap-1 rounded-lg px-2">
        {APP_CATALOG.map((app) => {
          const Icon = getAppIcon(app.id);
          const isOpen = openAppTypes.has(app.id);
          const hasMinimized = workspace.apps.some(
            (a) => a.type === app.id && minimizedAppIds.includes(a.id)
          );
          const isActive = isOpen || hasMinimized;
          return (
            <Button
              key={app.id}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "size-12 rounded-xl transition-colors",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              onClick={() => handleAppClick(app.id)}
              title={hasMinimized ? `Restore ${app.name}` : app.name}
              aria-label={hasMinimized ? `Restore ${app.name}` : `Open ${app.name}`}
            >
              <Icon className="size-6" />
            </Button>
          );
        })}
      </div>
    </motion.div>
  );
}

export const TASKBAR_HEIGHT_PX = TASKBAR_HEIGHT;
