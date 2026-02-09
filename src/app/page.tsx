"use client";

import { useEffect } from "react";
import { ModeProvider } from "@/features/workspace/mode-provider";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useSettingsStore } from "@/store/use-settings-store";
import { HomeView } from "@/features/workspace/home-view";
import { WorkspaceView } from "@/features/workspace/workspace-view";
import { AgentView } from "@/features/workspace/agent-view";

export default function Home() {
  const view = useWorkspaceStore((s) => s.view);
  const setView = useWorkspaceStore((s) => s.setView);
  const geminiApiKey = useSettingsStore((s) => s.geminiApiKey);
  const hasGeminiKey = !!geminiApiKey?.trim();

  useEffect(() => {
    if (view === "agent" && !hasGeminiKey) {
      setView("home");
    }
  }, [view, hasGeminiKey, setView]);

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
