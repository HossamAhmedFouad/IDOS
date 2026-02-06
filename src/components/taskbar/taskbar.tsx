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
  const workspace = useWorkspaceStore((s) => s.workspace);
  const openAppTypes = new Set(workspace.apps.map((a) => a.type));

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
          return (
            <Button
              key={app.id}
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "size-12 rounded-xl transition-colors",
                isOpen
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              onClick={() => addApp(app.id)}
              title={app.name}
              aria-label={`Open ${app.name}`}
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
