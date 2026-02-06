"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/use-workspace-store";

/**
 * ModeProvider: applies system modes to the document (e.g. dark class on html).
 */
export function ModeProvider({ children }: { children: React.ReactNode }) {
  const activeModes = useWorkspaceStore((s) => s.activeModes);

  useEffect(() => {
    const html = document.documentElement;
    if (activeModes.includes("focus")) {
      html.setAttribute("data-focus", "true");
    } else {
      html.removeAttribute("data-focus");
    }
    if (activeModes.includes("dnd")) {
      html.setAttribute("data-dnd", "true");
    } else {
      html.removeAttribute("data-dnd");
    }
  }, [activeModes]);

  return <>{children}</>;
}
