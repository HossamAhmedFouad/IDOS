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
    if (activeModes.includes("dark")) {
      html.classList.add("dark");
      html.setAttribute("data-theme", "dark");
    } else {
      html.classList.remove("dark");
      html.removeAttribute("data-theme");
    }
  }, [activeModes]);

  return <>{children}</>;
}
