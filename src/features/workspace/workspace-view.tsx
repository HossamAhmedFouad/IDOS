"use client";

import { useMemo, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { computeLayout } from "./layout-engine";
import { AppRenderer } from "./app-renderer";
import { AppsPicker } from "@/components/apps-picker";
import { IntentInput } from "@/features/intent/intent-input";

export function WorkspaceView() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeModes = useWorkspaceStore((s) => s.activeModes);
  const setActiveModes = useWorkspaceStore((s) => s.setActiveModes);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

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

  const TOP_BAR_HEIGHT = 56;
  const layoutResult = useMemo(
    () =>
      computeLayout(
        workspace,
        viewport.width || 800,
        Math.max(200, (viewport.height || 600) - TOP_BAR_HEIGHT)
      ),
    [workspace, viewport.width, viewport.height]
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Top bar with Intent input, Add app, Dark mode, Clear */}
      <div className="absolute left-0 right-0 top-0 z-50 flex items-center gap-4 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="flex shrink-0 items-center gap-3">
          <AppsPicker />
          {layoutResult.apps.length > 0 && (
            <button
              type="button"
              onClick={clearWorkspace}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Clear workspace
            </button>
          )}
        </div>
        <div className="relative flex min-w-0 flex-1 items-center justify-center">
          <IntentInput />
        </div>
        <button
          type="button"
          onClick={toggleDark}
          className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {isDark ? "Light" : "Dark"}
        </button>
      </div>

      {/* App windows container - offset for top bar */}
      <div
        className="absolute left-0 right-0 top-14 bottom-0"
        style={{ minHeight: "calc(100vh - 3.5rem)" }}
      >
        {layoutResult.apps.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-xl font-medium text-zinc-600 dark:text-zinc-400">
              Intent-Driven OS
            </h2>
            <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-500">
              Describe what you want to do in the intent bar, or click{" "}
              <strong>Add app</strong> to add Notes, Timer, Todo, and more.
            </p>
          </div>
        ) : (
          <AppRenderer layoutResult={layoutResult} activeModes={activeModes} />
        )}
      </div>
    </div>
  );
}
