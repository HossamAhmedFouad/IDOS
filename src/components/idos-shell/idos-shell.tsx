"use client";

import { useEffect, useState } from "react";
import { CustomContextMenu } from "@/components/context-menu";
import { PersonalizationPanel } from "@/components/personalization-panel";
import { AgentPanel, AgentRunDialog } from "@/components/agent-panel";
import { AgentToolRegistration } from "@/components/agent-tool-registration";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { useAgentStore } from "@/store/use-agent-store";
import { BootScreen } from "@/components/boot-screen";

const DEFAULT_THEME = "violet";

export function IdosShell({ children }: { children: React.ReactNode }) {
  const themeId = usePersonalizationStore((s) => s.themeId);
  const [bootComplete, setBootComplete] = useState(false);
  const openAgentRunDialog = useAgentStore((s) => s.openAgentRunDialog);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeId ?? DEFAULT_THEME);
  }, [themeId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openAgentRunDialog();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openAgentRunDialog]);

  return (
    <>
      <AgentToolRegistration />
      {!bootComplete && <BootScreen onComplete={() => setBootComplete(true)} />}
      {children}
      <CustomContextMenu />
      <PersonalizationPanel />
      <AgentPanel />
      <AgentRunDialog />
    </>
  );
}
