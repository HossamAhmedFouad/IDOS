"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomContextMenu } from "@/components/context-menu";
import { PersonalizationPanel } from "@/components/personalization-panel";
import { AgentRunDialog } from "@/components/agent-panel";
import { AgentToolRegistration } from "@/components/agent-tool-registration";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { useAgentStore } from "@/store/use-agent-store";
import { useSettingsStore } from "@/store/use-settings-store";
import { BootScreen } from "@/components/boot-screen";

const DEFAULT_THEME = "violet";

export function IdosShell({ children }: { children: React.ReactNode }) {
  const themeId = usePersonalizationStore((s) => s.themeId);
  const [bootComplete, setBootComplete] = useState(false);
  const openAgentRunDialog = useAgentStore((s) => s.openAgentRunDialog);
  const geminiApiKey = useSettingsStore((s) => s.geminiApiKey);
  const hasGeminiKey = !!geminiApiKey?.trim();
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeId ?? DEFAULT_THEME);
  }, [themeId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!hasGeminiKey) {
          router.push("/settings");
          return;
        }
        openAgentRunDialog();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openAgentRunDialog, hasGeminiKey, router]);

  return (
    <>
      <AgentToolRegistration />
      {!bootComplete && <BootScreen onComplete={() => setBootComplete(true)} />}
      {children}
      <CustomContextMenu />
      <PersonalizationPanel />
      <AgentRunDialog />
    </>
  );
}
