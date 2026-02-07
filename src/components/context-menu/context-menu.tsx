"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Home,
  Palette,
  RefreshCw,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useWorkspaceStore, type AppView } from "@/store/use-workspace-store";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { AboutModal } from "@/components/about-modal";

type MenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  action?: () => void;
  href?: string;
};

function getMenuItems(
  setView: (v: AppView) => void,
  openPersonalization: () => void,
  openAbout: () => void
): MenuItem[] {
  return [
    { id: "home", label: "Home", icon: Home, action: () => setView("home") },
    { id: "personalization", label: "Personalization", icon: Palette, action: openPersonalization },
    { id: "refresh", label: "Refresh", icon: RefreshCw, action: () => window.location.reload() },
    { id: "about", label: "About IDOS", icon: Info, action: openAbout },
  ];
}

export function CustomContextMenu() {
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const setView = useWorkspaceStore((s) => s.setView);
  const setPersonalizationPanelOpen = usePersonalizationStore((s) => s.setPersonalizationPanelOpen);
  const openPersonalization = useCallback(() => {
    setPersonalizationPanelOpen(true);
  }, [setPersonalizationPanelOpen]);
  const openAbout = useCallback(() => setAboutOpen(true), []);
  const defaultItems = getMenuItems(setView, openPersonalization, openAbout);

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 200;
    const menuHeight = 280;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    setPosition({ x: Math.max(8, x), y: Math.max(8, y) });
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);
    document.addEventListener("keydown", (e) => e.key === "Escape" && close());
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [onContextMenu, close]);

  const handleAction = useCallback(
    (item: MenuItem) => {
      if (item.action) item.action();
      if (item.href) window.location.href = item.href;
      close();
    },
    [close]
  );

  return (
    <>
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
              onClick={close}
              aria-hidden
            />
            <motion.div
              role="menu"
              aria-label="IDOS context menu"
              className="fixed z-[9999] min-w-[200px] rounded-xl border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur-md"
              style={{ left: position.x, top: position.y }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12 }}
            >
              <div className="mb-2 flex items-center gap-2 border-b border-border/80 px-2.5 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-foreground">IDOS</span>
              </div>
              <ul className="space-y-0.5">
                {defaultItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => handleAction(item)}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-80" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
