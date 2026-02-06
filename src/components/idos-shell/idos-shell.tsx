"use client";

import { useEffect, useState } from "react";
import { CustomContextMenu } from "@/components/context-menu";
import { PersonalizationPanel } from "@/components/personalization-panel";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { BootScreen } from "@/components/boot-screen";

const DEFAULT_THEME = "violet";

export function IdosShell({ children }: { children: React.ReactNode }) {
  const themeId = usePersonalizationStore((s) => s.themeId);
  const [bootComplete, setBootComplete] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeId ?? DEFAULT_THEME);
  }, [themeId]);

  return (
    <>
      {!bootComplete && <BootScreen onComplete={() => setBootComplete(true)} />}
      {children}
      <CustomContextMenu />
      <PersonalizationPanel />
    </>
  );
}
