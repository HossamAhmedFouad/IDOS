"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutGrid, Home, Play, Sparkles, Plus, Pencil, Trash2, Star, GripVertical, Loader2, Settings } from "lucide-react";
import {
  useWorkspaceStore,
  selectActiveWorkspaceConfig,
  selectMinimizedAppIds,
} from "@/store/use-workspace-store";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { useSettingsStore } from "@/store/use-settings-store";
import { useAgentStore } from "@/store/use-agent-store";
import { useAgentSessionsStore } from "@/store/use-agent-sessions-store";
import { useAgentExecution } from "@/hooks/use-agent-execution";
import {
  AgentExecutionStepCard,
  buildExecutionSteps,
  AgentCodePreview,
  getCodePreviewFromHistory,
  isCodeToolCallPending,
} from "@/components/agent-panel";
import { MarkdownContent } from "@/components/markdown-content";
import { ParticleBackground } from "@/components/particle-background";
import { GeometricField } from "@/components/geometric-field";
import { WallpaperBackground } from "@/components/wallpaper-background";
import { Taskbar, TASKBAR_HEIGHT_PX } from "@/components/taskbar";
import { FullscreenButton } from "@/components/fullscreen-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntentInput } from "@/features/intent/intent-input";
import { computeLayout } from "./layout-engine";
import { AppRenderer } from "./app-renderer";
import { cn } from "@/lib/utils";
import type { AppId } from "@/lib/types";
import { getAppName } from "@/lib/constants/app-catalog";
import { AGENT_PLACEHOLDER_ID } from "@/lib/constants/agent-placeholder";
import { getAppComponent } from "@/apps/registry";
import { uiUpdateExecutor } from "@/lib/uiUpdateExecutor";
import type { AppSpecificUIUpdate } from "@/lib/types/uiUpdates";
import { Suspense } from "react";

const TOP_BAR_HEIGHT = 48;
const MIN_PANE_WIDTH_PX = 280;

function toolNameToAppId(toolName: string): AppId | null {
  if (!toolName || typeof toolName !== "string") return null;
  if (toolName.startsWith("notes_")) return "notes";
  if (toolName.startsWith("todo_")) return "todo";
  if (toolName.startsWith("calendar_")) return "calendar";
  if (toolName.startsWith("file_browser_")) return "file-browser";
  if (toolName.startsWith("timer_")) return "timer";
  if (toolName.startsWith("code_editor_")) return "code-editor";
  if (toolName.startsWith("email_")) return "email";
  if (toolName.startsWith("whiteboard_")) return "whiteboard";
  if (toolName.startsWith("quiz_")) return "quiz";
  return null;
}

function uiUpdateTypeToAppId(type: string): AppId | null {
  if (type.startsWith("notes_")) return "notes";
  if (type.startsWith("todo_")) return "todo";
  if (type.startsWith("calendar_")) return "calendar";
  if (type.startsWith("timer_")) return "timer";
  if (type.startsWith("file_browser_")) return "file-browser";
  if (type.startsWith("code_editor_")) return "code-editor";
  if (type.startsWith("whiteboard_")) return "whiteboard";
  if (type.startsWith("email_")) return "email";
  return null;
}

function AppLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  );
}

export function AgentView() {
  const setView = useWorkspaceStore((s) => s.setView);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const workspace = useWorkspaceStore(selectActiveWorkspaceConfig);
  const activeModes = useWorkspaceStore((s) => s.activeModes);
  const agentViewSplitRatio = useWorkspaceStore((s) => s.agentViewSplitRatio);
  const setAgentViewSplitRatio = useWorkspaceStore((s) => s.setAgentViewSplitRatio);

  const agentSessions = useAgentSessionsStore((s) => s.agentSessions);
  const activeAgentSessionId = useAgentSessionsStore((s) => s.activeAgentSessionId);
  const setActiveSession = useAgentSessionsStore((s) => s.setActiveSession);
  const removeSession = useAgentSessionsStore((s) => s.removeSession);
  const updateSessionLabel = useAgentSessionsStore((s) => s.updateSessionLabel);
  const setSessionFavorite = useAgentSessionsStore((s) => s.setSessionFavorite);
  const openAgentRunDialog = useAgentStore((s) => s.openAgentRunDialog);

  const geminiApiKey = useSettingsStore((s) => s.geminiApiKey);
  const hasGeminiKey = !!geminiApiKey?.trim();
  const backgroundType = usePersonalizationStore((s) => s.backgroundType);
  const particleSystem = usePersonalizationStore((s) => s.particleSystem);
  const particleShape = usePersonalizationStore((s) => s.particleShape);

  const isExecuting = useAgentStore((s) => s.isExecuting);
  const executionHistory = useAgentStore((s) => s.executionHistory);
  const streamingThinking = useAgentStore((s) => s.streamingThinking);
  const lastCreatedNotePath = useAgentStore((s) => s.lastCreatedNotePath);
  const agentRecentNotePaths = useAgentStore((s) => s.agentRecentNotePaths);
  const lastCodeEditorFilePath = useAgentStore((s) => s.lastCodeEditorFilePath);
  const agentRecentCodeEditorPaths = useAgentStore((s) => s.agentRecentCodeEditorPaths);

  const { executeIntent } = useAgentExecution();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const executionScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [focusedAppIdOverride, setFocusedAppIdOverride] = useState<AppId | null>(null);
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

  const hasWorkspaceApps =
    activeWorkspaceId != null && workspace.apps.length > 0;
  const layoutResult = useMemo(
    () =>
      hasWorkspaceApps
        ? computeLayout(
            workspace,
            viewport.width || 800,
            Math.max(
              200,
              (viewport.height || 600) - TOP_BAR_HEIGHT - TASKBAR_HEIGHT_PX
            )
          )
        : { apps: [] },
    [hasWorkspaceApps, workspace, viewport.width, viewport.height]
  );

  const minimizedAppIds = useWorkspaceStore(selectMinimizedAppIds);
  const allAppsMinimized =
    layoutResult.apps.length > 0 &&
    layoutResult.apps.every((app) => minimizedAppIds.includes(app.id));

  const activeSession = agentSessions.find((s) => s.id === activeAgentSessionId);
  const isViewingLiveRun =
    activeSession?.status === "running" && isExecuting;
  const displayHistory = isViewingLiveRun ? executionHistory : (activeSession?.executionHistory ?? []);

  useEffect(() => {
    if (agentSessions.length > 0 && activeAgentSessionId === null) {
      setActiveSession(agentSessions[agentSessions.length - 1].id);
    }
  }, [agentSessions.length, activeAgentSessionId, setActiveSession, agentSessions]);

  const handleRunAnother = useCallback(
    (
      intent: string,
      options?: { attachedFiles?: { path: string; content: string }[] }
    ) => {
      executeIntent(intent, {
        continueInSession: true,
        ...(options?.attachedFiles &&
          options.attachedFiles.length > 0 && {
            attachedFiles: options.attachedFiles,
          }),
      });
    },
    [executeIntent]
  );

  const startRename = (s: { id: string; label?: string; intent?: string }) => {
    setRenamingId(s.id);
    setRenameValue(s.label ?? s.intent ?? "");
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const commitRename = () => {
    if (renamingId != null) {
      updateSessionLabel(renamingId, renameValue);
      setRenamingId(null);
      setRenameValue("");
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const sortedSessions = [...agentSessions].sort((a, b) => {
    const aFav = a.isFavorite ? 1 : 0;
    const bFav = b.isFavorite ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    const aTime = a.lastAccessedAt ?? a.createdAt;
    const bTime = b.lastAccessedAt ?? b.createdAt;
    return bTime - aTime;
  });

  const noSessions = agentSessions.length === 0;
  const hasActiveSession = activeAgentSessionId != null;

  // Reset focus override when session changes so focus follows latest run
  useEffect(() => {
    setFocusedAppIdOverride(null);
  }, [activeAgentSessionId]);

  // When a queued UI update finishes, switch to the app that has the next update so it is visible
  useEffect(() => {
    const onBeforeNextUpdate = (nextUpdate: AppSpecificUIUpdate) => {
      const appId = uiUpdateTypeToAppId(nextUpdate.type);
      if (appId) setFocusedAppIdOverride(appId);
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
    };
    uiUpdateExecutor.setOnBeforeNextUpdate(onBeforeNextUpdate);
    return () => uiUpdateExecutor.setOnBeforeNextUpdate(null);
  }, []);

  // Auto-scroll execution list to latest event
  useEffect(() => {
    const el = executionScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [displayHistory.length, streamingThinking]);

  // Execution steps: pair tool-call with tool-result, keep other events as single steps
  const executionSteps = useMemo(
    () => buildExecutionSteps(displayHistory.filter((e) => e.type !== "agent-start")),
    [displayHistory]
  );

  // Code preview when last event is a code tool-call (no result yet)
  const codePreview = useMemo(
    () => (isCodeToolCallPending(displayHistory) ? getCodePreviewFromHistory(displayHistory) : null),
    [displayHistory]
  );

  // Affected apps: unique app IDs in order of first appearance in execution
  const affectedAppIds = useMemo(() => {
    const seen = new Set<AppId>();
    const result: AppId[] = [];
    for (const e of displayHistory) {
      if (e.type !== "tool-call" && e.type !== "tool-result") continue;
      const toolName = e.data?.toolName as string | undefined;
      if (!toolName) continue;
      const appId = toolNameToAppId(toolName);
      if (appId && !seen.has(appId)) {
        seen.add(appId);
        result.push(appId);
      }
    }
    return result;
  }, [displayHistory]);

  // App shown in left pane: user-selected or first affected (do not auto-switch on new tool so UI updates are not interrupted)
  const displayedAppId = focusedAppIdOverride ?? affectedAppIds[0] ?? null;

  // Instance id and config for the displayed app (use lastCreatedNotePath + agentRecentNotePaths for notes preview so user can navigate between agent-created notes)
  const agentCodeEditorDirectoryPath = useAgentStore((s) => s.agentCodeEditorDirectoryPath);

  const displayedAppInstance = useMemo(() => {
    if (!displayedAppId) return null;
    const match = workspace.apps?.find((app) => app.type === displayedAppId);
    if (match) return { id: match.id, config: match.config };
    const previewConfig =
      displayedAppId === "notes" && (lastCreatedNotePath || agentRecentNotePaths.length > 0)
        ? {
            filePath: lastCreatedNotePath ?? agentRecentNotePaths[0],
            recentFilePaths: agentRecentNotePaths,
            agentPreview: true,
          }
        : displayedAppId === "whiteboard"
          ? { filePath: "/whiteboard/default.json" }
          : displayedAppId === "code-editor"
            ? (() => {
                const filePath =
                  lastCodeEditorFilePath ?? agentRecentCodeEditorPaths[0] ?? undefined;
                const dirFromFile = filePath
                  ? (filePath.replace(/\/[^/]+$/, "") || "/")
                  : undefined;
                const directoryPath =
                  agentCodeEditorDirectoryPath ?? dirFromFile ?? "/code";
                return {
                  directoryPath,
                  filePath,
                };
              })()
            : {};
    return { id: AGENT_PLACEHOLDER_ID, config: previewConfig };
  }, [
    displayedAppId,
    workspace.apps,
    lastCreatedNotePath,
    agentRecentNotePaths,
    lastCodeEditorFilePath,
    agentRecentCodeEditorPaths,
    agentCodeEditorDirectoryPath,
  ]);

  // Resizable split: drag to update ratio
  const handleSplitPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);
  const handleSplitPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingSplit) return;
      const container = (e.target as HTMLElement).closest("[data-agent-split-container]");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setAgentViewSplitRatio(ratio);
    },
    [isDraggingSplit, setAgentViewSplitRatio]
  );
  const handleSplitPointerUp = useCallback((e: React.PointerEvent) => {
    setIsDraggingSplit(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {backgroundType === "wallpaper" && <WallpaperBackground />}
      {backgroundType === "geometric" && <GeometricField />}
      <ParticleBackground
        intentLength={0}
        loading={false}
        blobCenter={null}
        particleSystem={particleSystem}
        particleShape={particleShape}
      />

      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-4 border-b border-border/80 bg-background/80 px-4 py-2 backdrop-blur-md">
        <div className="flex min-w-0 shrink items-center gap-2">
          <FullscreenButton />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("home")}
            className="gap-2 shrink-0 text-muted-foreground hover:text-foreground"
            title="Home"
          >
            <Home className="size-4" />
            Home
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (workspaces.length > 0) {
                setView("workspace");
                if (activeWorkspaceId === null && workspaces[0]) {
                  setActiveWorkspace(workspaces[0].id);
                }
              }
            }}
            disabled={workspaces.length === 0}
            className="gap-2 shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
            title={workspaces.length === 0 ? "No workspace" : "Workspace"}
          >
            <LayoutGrid className="size-4" />
            Workspace
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 shrink-0 bg-primary/10 text-primary"
            title="Agent"
            aria-current="page"
          >
            <Sparkles className="size-4" />
            Agent
          </Button>
          <Link
            href="/settings"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Settings"
          >
            <Settings className="size-4" />
            Settings
          </Link>
          {agentSessions.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto">
              {sortedSessions.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1",
                    s.id === activeAgentSessionId
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 bg-background/50"
                  )}
                >
                  {renamingId === s.id ? (
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
                        onClick={() => setActiveSession(s.id)}
                        className="flex max-w-[140px] items-center gap-1.5 truncate rounded py-0.5 text-left text-sm text-foreground hover:bg-accent/50"
                        title={s.intent ?? `Session ${agentSessions.indexOf(s) + 1}`}
                      >
                        <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {s.label ?? s.intent ?? `Session ${agentSessions.indexOf(s) + 1}`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(s);
                        }}
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Rename session"
                        title="Rename session"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionFavorite(s.id, !s.isFavorite);
                        }}
                        className={cn(
                          "shrink-0 rounded p-0.5",
                          s.isFavorite ? "text-amber-500" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                        aria-label={s.isFavorite ? "Unfavorite" : "Favorite"}
                        title={s.isFavorite ? "Unfavorite" : "Add to favorites"}
                      >
                        <Star className={cn("size-3.5", s.isFavorite && "fill-current")} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (renamingId === s.id) cancelRename();
                      removeSession(s.id);
                    }}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    aria-label="Delete session"
                    title="Delete session"
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
            onClick={() => hasGeminiKey && openAgentRunDialog()}
            disabled={!hasGeminiKey}
            className="gap-1.5 shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
            title={hasGeminiKey ? "New agent task" : "Set up Gemini API key in Settings"}
          >
            <Plus className="size-4" />
            New
          </Button>
        </div>
      </div>

      {/* Agent content below app layer (z-20) so open apps block interaction; passthrough when all minimized */}
      <div
        className="absolute left-0 right-0 bottom-0 z-20 pointer-events-none flex flex-col overflow-hidden"
        style={{ top: TOP_BAR_HEIGHT, bottom: TASKBAR_HEIGHT_PX }}
      >
        <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden pointer-events-auto">
        {noSessions ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="text-xl font-medium text-muted-foreground">
              No agent sessions yet
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {hasGeminiKey
                ? "Run your first agent task from Home or use the shortcut Ctrl+K (Cmd+K on Mac)."
                : "Add your Gemini API key in Settings to use the agent."}
            </p>
            <div className="flex gap-2">
              {hasGeminiKey ? (
                <Button
                  type="button"
                  variant="default"
                  onClick={openAgentRunDialog}
                  className="gap-2"
                >
                  <Sparkles className="size-4" />
                  Run agent task
                </Button>
              ) : (
                <Link href="/settings">
                  <Button type="button" variant="default" className="gap-2">
                    <Settings className="size-4" />
                    Open Settings
                  </Button>
                </Link>
              )}
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
        ) : (
          <div
            data-agent-split-container
            className="flex flex-1 min-h-0 w-full"
          >
            {/* Left: Tabbed view of affected apps (focus view) */}
            <div
              ref={leftPaneRef}
              id="agent-app-pane"
              className="flex flex-col shrink-0 overflow-hidden bg-background/50 border-r border-border/60"
              style={{
                width: `${agentViewSplitRatio * 100}%`,
                minWidth: MIN_PANE_WIDTH_PX,
              }}
            >
              {affectedAppIds.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                  <LayoutGrid className="size-8 opacity-50" />
                  <p>The app being used will appear here when the agent runs a tool.</p>
                </div>
              ) : (
                <>
                  <div
                    role="tablist"
                    className="flex shrink-0 border-b border-border/60 bg-muted/30"
                  >
                    {affectedAppIds.map((appId) => {
                      const isSelected = appId === displayedAppId;
                      return (
                        <button
                          key={appId}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() =>
                            setFocusedAppIdOverride(isSelected ? null : appId)
                          }
                          className={cn(
                            "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                            isSelected
                              ? "border-primary bg-background/80 text-primary"
                              : "border-transparent text-muted-foreground hover:bg-background/50 hover:text-foreground"
                          )}
                        >
                          {getAppName(appId)}
                        </button>
                      );
                    })}
                  </div>
                  {displayedAppId && displayedAppInstance && (
                    <div className="relative flex-1 min-h-0 w-full overflow-auto">
                      <Suspense fallback={<AppLoadingFallback />}>
                        {(() => {
                          const Component = getAppComponent(displayedAppId);
                          const appProps = {
                            id: displayedAppInstance.id,
                            appType: displayedAppId,
                            position: { x: 0, y: 0 },
                            dimensions: { width: 800, height: 600 },
                            activeModes,
                            config: displayedAppInstance.config,
                          };
                          return <Component key={displayedAppInstance.id} {...appProps} />;
                        })()}
                      </Suspense>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Resizable divider */}
            <div
              role="separator"
              aria-label="Resize panes"
              className={cn(
                "w-2 shrink-0 cursor-col-resize flex items-center justify-center bg-border/30 hover:bg-border/60 transition-colors",
                isDraggingSplit && "bg-primary/20"
              )}
              style={{ touchAction: "none" }}
              onPointerDown={handleSplitPointerDown}
              onPointerMove={handleSplitPointerMove}
              onPointerUp={handleSplitPointerUp}
              onPointerLeave={handleSplitPointerUp}
            >
              <GripVertical className="size-4 text-muted-foreground" />
            </div>

            {/* Right: Execution sequence (scrollable) + chat bar below */}
            <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[color-mix(in_oklch,var(--agent-accent-muted)_4%,transparent)]">
              {/* Scrollable execution list — auto-scrolls to latest */}
              <div
                ref={executionScrollRef}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4"
              >
                {codePreview && (
                  <div className="mb-3">
                    <AgentCodePreview
                      content={codePreview.content}
                      path={codePreview.path}
                      toolName={codePreview.toolName}
                      typewriter
                    />
                  </div>
                )}
                <h3 className="mb-2 text-sm font-medium text-agent-accent-foreground">
                  Execution sequence
                </h3>
                <div className="space-y-2">
                  {executionSteps.map((step, idx) => {
                    const isToolStep = step.kind === "tool";
                    const toolStepNum = isToolStep
                      ? executionSteps
                          .slice(0, idx)
                          .filter((s) => s.kind === "tool").length + 1
                      : 0;
                    return (
                      <div key={idx} className="flex gap-2">
                        {isToolStep && (
                          <span className="shrink-0 mt-0.5 text-xs font-mono text-muted-foreground tabular-nums">
                            {toolStepNum}.
                          </span>
                        )}
                        {step.kind === "other" &&
                          (step.event.type === "user-message" ? (
                            <div className="flex w-full justify-end">
                              <div className="max-w-[85%]">
                                <AgentExecutionStepCard
                                  step={step}
                                  stepIndex={idx}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full">
                              <AgentExecutionStepCard
                                step={step}
                                stepIndex={idx}
                              />
                            </div>
                          ))}
                        {step.kind === "tool" && (
                          <div className="min-w-0 flex-1">
                            <AgentExecutionStepCard
                              step={step}
                              stepIndex={idx}
                              defaultExpanded={false}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Loading UI: show whenever execution is in progress (e.g. right after Enter) */}
                {isExecuting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-agent-accent/20 bg-[color-mix(in_oklch,var(--agent-accent)_6%,transparent)] px-3 py-2"
                  >
                    {streamingThinking ? (
                      <>
                        <Loader2 className="size-3.5 shrink-0 animate-spin text-agent-accent-foreground" />
                        <span className="text-xs font-medium text-agent-accent-foreground">Thinking…</span>
                        <div className="min-w-0 flex-1 overflow-hidden text-ellipsis text-sm text-foreground line-clamp-1">
                          <MarkdownContent content={streamingThinking} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Loader2 className="size-3.5 shrink-0 animate-spin text-agent-accent-foreground" />
                        <span className="text-sm text-agent-accent-foreground">
                          {executionHistory.filter((e) => e.type !== "agent-start").length === 0
                            ? "Starting…"
                            : "Getting response…"}
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </div>
              {/* Chat bar: smaller, fixed under execution list */}
              {hasActiveSession && (
                <div className="shrink-0 border-t border-border/60 bg-background/60 px-3 py-2">
                  <div className="mx-auto max-w-4xl w-full">
                    {hasGeminiKey ? (
                      <IntentInput
                        submitIcon={Play}
                        submitLabel="Run"
                        onAgentSubmit={handleRunAnother}
                        keepLoadingAfterAgentSubmit
                        loading={isExecuting}
                      />
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                        Add your Gemini API key in Settings to run another task.
                        <Link href="/settings">
                          <Button variant="link" size="sm" className="gap-1 h-auto p-0">
                            <Settings className="size-3.5" />
                            Open Settings
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Floating app layer: z-30 above agent UI (z-20) so open apps block top bar and content; passthrough when all minimized */}
      {layoutResult.apps.length > 0 && (
        <div
          className={cn(
            "absolute left-0 right-0 z-30",
            allAppsMinimized && "pointer-events-none"
          )}
          style={{
            top: TOP_BAR_HEIGHT,
            bottom: TASKBAR_HEIGHT_PX,
            minHeight: `calc(100vh - ${TOP_BAR_HEIGHT}px - ${TASKBAR_HEIGHT_PX}px)`,
          }}
        >
          <AppRenderer layoutResult={layoutResult} activeModes={activeModes} />
        </div>
      )}

      <Taskbar />
    </div>
  );
}
