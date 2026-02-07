"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Home, Play } from "lucide-react";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { useAgentStore } from "@/store/use-agent-store";
import { useAgentExecution } from "@/hooks/use-agent-execution";
import { AgentEventCard } from "@/components/agent-panel";
import { ParticleBackground } from "@/components/particle-background";
import { GeometricField } from "@/components/geometric-field";
import { WallpaperBackground } from "@/components/wallpaper-background";
import { Taskbar, TASKBAR_HEIGHT_PX } from "@/components/taskbar";
import { Button } from "@/components/ui/button";
import { IntentInput } from "@/features/intent/intent-input";

export function AgentView() {
  const setView = useWorkspaceStore((s) => s.setView);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const backgroundType = usePersonalizationStore((s) => s.backgroundType);
  const particleSystem = usePersonalizationStore((s) => s.particleSystem);
  const particleShape = usePersonalizationStore((s) => s.particleShape);

  const isExecuting = useAgentStore((s) => s.isExecuting);
  const currentIntent = useAgentStore((s) => s.currentIntent);
  const executionHistory = useAgentStore((s) => s.executionHistory);
  const streamingThinking = useAgentStore((s) => s.streamingThinking);

  const { executeIntent } = useAgentExecution();

  const handleRunAnother = useCallback(
    (intent: string) => {
      executeIntent(intent);
    },
    [executeIntent]
  );

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

      <div className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between gap-4 border-b border-border/80 bg-background/80 px-4 py-2 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-foreground">Agent</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("home")}
            className="gap-2 text-muted-foreground hover:text-foreground"
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
            className="gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
            title={workspaces.length === 0 ? "No workspace" : "Workspace"}
          >
            <LayoutGrid className="size-4" />
            Workspace
          </Button>
        </div>
      </div>

      <div
        className="absolute left-0 right-0 bottom-0 z-20 flex flex-col overflow-hidden"
        style={{ top: 56, bottom: TASKBAR_HEIGHT_PX }}
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
          {currentIntent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30"
            >
              <div className="mb-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                Intent
              </div>
              <div className="text-sm text-foreground">{currentIntent}</div>
            </motion.div>
          )}
          <div className="space-y-3">
            {executionHistory.map((event, idx) => (
              <AgentEventCard key={idx} event={event} />
            ))}
          </div>
          {isExecuting && !streamingThinking && executionHistory.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 rounded-lg border border-border bg-muted/50 p-3"
            >
              <div className="text-sm text-muted-foreground">Starting…</div>
            </motion.div>
          )}
          {isExecuting && streamingThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 animate-pulse rounded-lg border border-border bg-muted/50 p-3"
            >
              <div className="mb-1 text-xs text-muted-foreground">Thinking…</div>
              <div className="text-sm text-foreground">{streamingThinking}</div>
            </motion.div>
          )}
          {!isExecuting && executionHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 max-w-4xl"
            >
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Run another task
              </p>
              <IntentInput
                submitIcon={Play}
                submitLabel="Run"
                onAgentSubmit={handleRunAnother}
              />
            </motion.div>
          )}
        </div>
      </div>

      <Taskbar />
    </div>
  );
}
