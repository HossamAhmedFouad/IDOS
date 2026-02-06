"use client";

import { useMemo, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { computeLayout } from "./layout-engine";
import { AppRenderer } from "./app-renderer";
import { Taskbar, TASKBAR_HEIGHT_PX } from "@/components/taskbar";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const TOP_BAR_HEIGHT = 48;

export function WorkspaceView() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeModes = useWorkspaceStore((s) => s.activeModes);
  const setActiveModes = useWorkspaceStore((s) => s.setActiveModes);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const setView = useWorkspaceStore((s) => s.setView);
  const [viewport, setViewport] = useState(() =>
    typeof window !== "undefined"
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 800, height: 600 }
  );

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const isDark = activeModes.includes("dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleDark = () => {
    setActiveModes(
      isDark ? activeModes.filter((m) => m !== "dark") : [...activeModes, "dark"]
    );
  };

  const clearWorkspace = () => {
    setWorkspace({
      apps: [],
      layoutStrategy: "floating",
      modes: activeModes,
    });
  };

  const layoutResult = useMemo(
    () =>
      computeLayout(
        workspace,
        viewport.width || 800,
        Math.max(200, (viewport.height || 600) - TOP_BAR_HEIGHT - TASKBAR_HEIGHT_PX)
      ),
    [workspace, viewport.width, viewport.height]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Thin top bar: Home, Clear, Dark toggle */}
      <div className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between gap-4 border-b border-border/80 bg-background/80 px-4 py-2 backdrop-blur-md">
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("home")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Home className="size-4" />
            Home
          </Button>
          {layoutResult.apps.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearWorkspace}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear workspace
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleDark}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {isDark ? "Light" : "Dark"}
        </Button>
      </div>

      {/* App windows container - offset for top bar and taskbar */}
      <div
        className="absolute left-0 right-0 z-10"
        style={{
          top: TOP_BAR_HEIGHT,
          bottom: TASKBAR_HEIGHT_PX,
          minHeight: `calc(100vh - ${TOP_BAR_HEIGHT}px - ${TASKBAR_HEIGHT_PX}px)`,
        }}
      >
        {layoutResult.apps.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-xl font-medium text-muted-foreground">
              Workspace
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Add apps from the bar below.
            </p>
          </div>
        ) : (
          <AppRenderer layoutResult={layoutResult} activeModes={activeModes} />
        )}
      </div>

      {/* Bottom taskbar (Windows/OS style) */}
      <Taskbar />
    </div>
  );
}
