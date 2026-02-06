"use client";

import { useEffect } from "react";
import { CustomContextMenu } from "@/components/context-menu";
import { PersonalizationPanel } from "@/components/personalization-panel";
import { usePersonalizationStore } from "@/store/use-personalization-store";

const DEFAULT_THEME = "violet";

export function IdosShell({ children }: { children: React.ReactNode }) {
  const themeId = usePersonalizationStore((s) => s.themeId);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeId ?? DEFAULT_THEME);
  }, [themeId]);

  return (
    <>
      {children}
      <CustomContextMenu />
      <PersonalizationPanel />
    </>
  );
}
