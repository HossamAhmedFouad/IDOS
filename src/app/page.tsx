"use client";

import { ModeProvider } from "@/features/workspace/mode-provider";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { HomeView } from "@/features/workspace/home-view";
import { WorkspaceView } from "@/features/workspace/workspace-view";
import { AgentView } from "@/features/workspace/agent-view";

export default function Home() {
  const view = useWorkspaceStore((s) => s.view);

  return (
    <ModeProvider>
      {view === "home" ? (
        <HomeView />
      ) : view === "agent" ? (
        <AgentView />
      ) : (
        <WorkspaceView />
      )}
    </ModeProvider>
  );
}
