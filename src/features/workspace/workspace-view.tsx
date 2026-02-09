"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  useWorkspaceStore,
  selectActiveWorkspaceConfig,
  selectMinimizedAppIds,
  defaultWorkspaceConfig,
} from "@/store/use-workspace-store";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { useSettingsStore } from "@/store/use-settings-store";
import { computeLayout } from "./layout-engine";
import { AppRenderer } from "./app-renderer";
import { ParticleBackground } from "@/components/particle-background";
import { GeometricField } from "@/components/geometric-field";
import { WallpaperBackground } from "@/components/wallpaper-background";
import { Taskbar } from "@/components/taskbar";
import { useTaskbarHeight } from "@/hooks/use-taskbar-height";
import { useTopBarHeight } from "@/hooks/use-top-bar-height";
import { FullscreenButton } from "@/components/fullscreen-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, LayoutGrid, Plus, Pencil, Trash2, Layout, Star, Sparkles, Settings, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { LayoutStrategy } from "@/lib/types/layout";


export function WorkspaceView() {
  const taskbarHeight = useTaskbarHeight();
  const topBarHeight = useTopBarHeight();
  const workspace = useWorkspaceStore(selectActiveWorkspaceConfig);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeModes = useWorkspaceStore((s) => s.activeModes);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const removeWorkspace = useWorkspaceStore((s) => s.removeWorkspace);
  const updateWorkspaceLabel = useWorkspaceStore((s) => s.updateWorkspaceLabel);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const updateActiveWorkspaceConfig = useWorkspaceStore(
    (s) => s.updateActiveWorkspaceConfig
  );
  const setView = useWorkspaceStore((s) => s.setView);
  const setLayoutStrategy = useWorkspaceStore((s) => s.setLayoutStrategy);
  const layoutStrategy = workspace.layoutStrategy;
  const snapToGrid = useWorkspaceStore((s) => s.snapToGrid);
  const setSnapToGrid = useWorkspaceStore((s) => s.setSnapToGrid);
  const setWorkspaceFavorite = useWorkspaceStore((s) => s.setWorkspaceFavorite);
  const geminiApiKey = useSettingsStore((s) => s.geminiApiKey);
  const hasGeminiKey = !!geminiApiKey?.trim();
  const backgroundType = usePersonalizationStore((s) => s.backgroundType);
  const particleSystem = usePersonalizationStore((s) => s.particleSystem);
  const particleShape = usePersonalizationStore((s) => s.particleShape);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [viewport, setViewport] = useState(() =>
    typeof window !== "undefined"
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 800, height: 600 }
  );

  // When on workspace view with workspaces but no active, select first (use first id to avoid effect loop from workspaces reference changes)
  const firstWorkspaceId = workspaces.length > 0 ? workspaces[0].id : null;
  useEffect(() => {
    if (firstWorkspaceId != null && activeWorkspaceId === null) {
      setActiveWorkspace(firstWorkspaceId);
    }
  }, [firstWorkspaceId, activeWorkspaceId, setActiveWorkspace]);

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

  const clearWorkspace = () => {
    updateActiveWorkspaceConfig({
      ...defaultWorkspaceConfig,
      modes: activeModes,
    });
  };

  const handleNewWorkspace = () => {
    createWorkspace(
      { ...defaultWorkspaceConfig, modes: activeModes },
      "New workspace"
    );
  };

  const startRename = (w: { id: string; label?: string }) => {
    setRenamingId(w.id);
    setRenameValue(w.label ?? "");
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const commitRename = () => {
    if (renamingId != null) {
      updateWorkspaceLabel(renamingId, renameValue);
      setRenamingId(null);
      setRenameValue("");
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const layoutResult = useMemo(
    () =>
      computeLayout(
        workspace,
        viewport.width || 800,
        Math.max(200, (viewport.height || 600) - topBarHeight - taskbarHeight)
      ),
    [workspace, viewport.width, viewport.height, taskbarHeight, topBarHeight]
  );

  const minimizedAppIds = useWorkspaceStore(selectMinimizedAppIds);
  const allAppsMinimized =
    layoutResult.apps.length > 0 &&
    layoutResult.apps.every((app) => minimizedAppIds.includes(app.id));

  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    const aFav = a.isFavorite ? 1 : 0;
    const bFav = b.isFavorite ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    const aTime = a.lastAccessedAt ?? 0;
    const bTime = b.lastAccessedAt ?? 0;
    return bTime - aTime;
  });

  const noWorkspaces = workspaces.length === 0;
  const hasActiveWorkspace = activeWorkspaceId != null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {backgroundType === "wallpaper" && <WallpaperBackground />}
      {backgroundType === "geometric" && <GeometricField />}
      <ParticleBackground
        intentLength={0}
        particleSystem={particleSystem}
        particleShape={particleShape}
      />
      {/* Thin top bar: Fullscreen, Home, Workspace switcher, nav; safe area + More menu on mobile */}
      <div
        className="absolute left-0 right-0 top-0 z-40 flex min-h-14 min-w-0 items-center justify-between gap-2 border-b border-border/80 bg-background/80 px-2 py-2 backdrop-blur-md sm:min-h-0 sm:gap-4 sm:px-4"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex min-w-0 shrink items-center gap-1 sm:gap-2">
          <FullscreenButton />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("home")}
            className="min-h-[var(--idos-touch-min,44px)] min-w-[var(--idos-touch-min,44px)] shrink-0 gap-2 p-2 text-muted-foreground hover:text-foreground sm:min-h-0 sm:min-w-0 sm:px-3"
          >
            <Home className="size-4 shrink-0" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          {workspaces.length > 0 && (
            <div className="flex min-h-[var(--idos-touch-min,44px)] items-center gap-1 overflow-x-auto sm:min-h-0">
              {sortedWorkspaces.map((w) => (
                <div
                  key={w.id}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1",
                    w.id === activeWorkspaceId
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 bg-background/50"
                  )}
                >
                  {renamingId === w.id ? (
                    <Input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 min-w-[80px] max-w-[140px] border-muted-foreground/30 text-sm"
                      placeholder="Name"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveWorkspace(w.id)}
                        className="flex max-w-[140px] items-center gap-1.5 truncate rounded py-0.5 text-left text-sm text-foreground hover:bg-accent/50"
                        title={w.label ?? `Workspace ${workspaces.indexOf(w) + 1}`}
                      >
                        <LayoutGrid className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {w.label ?? `Workspace ${workspaces.indexOf(w) + 1}`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(w);
                        }}
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Rename workspace"
                        title="Rename workspace"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkspaceFavorite(w.id, !w.isFavorite);
                        }}
                        className={cn(
                          "shrink-0 rounded p-0.5",
                          w.isFavorite ? "text-amber-500" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                        aria-label={w.isFavorite ? "Unfavorite" : "Favorite"}
                        title={w.isFavorite ? "Unfavorite" : "Add to favorites"}
                      >
                        <Star className={cn("size-3.5", w.isFavorite && "fill-current")} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (renamingId === w.id) cancelRename();
                      removeWorkspace(w.id);
                    }}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    aria-label="Delete workspace"
                    title="Delete workspace"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => hasGeminiKey && setView("agent")}
            disabled={!hasGeminiKey}
            className="min-h-[var(--idos-touch-min,44px)] min-w-[var(--idos-touch-min,44px)] shrink-0 gap-1.5 p-2 text-muted-foreground hover:text-foreground disabled:opacity-50 sm:min-h-0 sm:min-w-0 sm:px-3"
            title={
              hasGeminiKey
                ? "Agent (Ctrl+K / Cmd+K to run)"
                : "Set up Gemini API key in Settings"
            }
          >
            <Sparkles className="size-4 shrink-0" />
            <span className="hidden sm:inline">Agent</span>
          </Button>
          <Link
            href="/settings"
            className="inline-flex min-h-[var(--idos-touch-min,44px)] min-w-[var(--idos-touch-min,44px)] shrink-0 items-center justify-center gap-1.5 rounded-md p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:min-h-8 sm:min-w-0 sm:px-3"
            title="Settings"
          >
            <Settings className="size-4 shrink-0" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          {/* Desktop: New, Clear, Layout inline; mobile: in More menu */}
          <span className="hidden sm:inline-flex sm:items-center sm:gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNewWorkspace}
              className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
              title="New workspace"
            >
              <Plus className="size-4" />
              New
            </Button>
            {hasActiveWorkspace && layoutResult.apps.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearWorkspace}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  Clear workspace
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
                      title="Layout"
                    >
                      <Layout className="size-4" />
                      <span className="capitalize">{layoutStrategy}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48 p-2">
                    <div className="mb-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                      Layout
                    </div>
                    {(["floating", "grid", "split", "tiled"] as LayoutStrategy[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setLayoutStrategy(s)}
                        className={cn(
                          "w-full rounded px-3 py-2 text-left text-sm capitalize",
                          layoutStrategy === s
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                    <div className="mt-2 border-t border-border pt-2">
                      <button
                        type="button"
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        className={cn(
                          "w-full rounded px-3 py-2 text-left text-sm",
                          snapToGrid ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-foreground"
                        )}
                      >
                        Snap to grid
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </span>
          {/* Mobile: More menu with New, Clear, Layout */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-[var(--idos-touch-min,44px)] min-w-[var(--idos-touch-min,44px)] shrink-0 p-2 text-muted-foreground hover:text-foreground sm:hidden"
                aria-label="More options"
                title="More"
              >
                <MoreHorizontal className="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <button
                type="button"
                onClick={handleNewWorkspace}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent"
              >
                <Plus className="size-4 shrink-0" />
                New workspace
              </button>
              {hasActiveWorkspace && layoutResult.apps.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={clearWorkspace}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent"
                  >
                    Clear workspace
                  </button>
                  <div className="my-2 border-t border-border pt-2">
                    <div className="mb-1 px-2 py-1 text-xs font-medium text-muted-foreground">Layout</div>
                    {(["floating", "grid", "split", "tiled"] as LayoutStrategy[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setLayoutStrategy(s)}
                        className={cn(
                          "w-full rounded px-3 py-2 text-left text-sm capitalize",
                          layoutStrategy === s
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSnapToGrid(!snapToGrid)}
                      className={cn(
                        "mt-1 w-full rounded px-3 py-2 text-left text-sm",
                        snapToGrid ? "bg-primary/10 text-primary" : "hover:bg-accent hover:text-foreground"
                      )}
                    >
                      Snap to grid
                    </button>
                  </div>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* App windows container - offset for top bar and taskbar; allow passthrough when all minimized */}
      <div
        className={cn(
          "absolute left-0 right-0 z-10",
          allAppsMinimized && "pointer-events-none"
        )}
        style={{
          top: topBarHeight,
          bottom: taskbarHeight,
          minHeight: `calc(100vh - ${topBarHeight}px - ${taskbarHeight}px)`,
        }}
      >
        {noWorkspaces ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-xl font-medium text-muted-foreground">
              No workspaces yet
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Create a workspace manually or go Home and describe what you want
              to do.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="default"
                onClick={handleNewWorkspace}
                className="gap-2"
              >
                <Plus className="size-4" />
                New workspace
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setView("home")}
                className="gap-2"
              >
                <Home className="size-4" />
                Go Home
              </Button>
            </div>
          </div>
        ) : layoutResult.apps.length === 0 ? (
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
