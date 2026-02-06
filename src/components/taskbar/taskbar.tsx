"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Search } from "lucide-react";
import {
  useWorkspaceStore,
  selectActiveWorkspaceConfig,
  selectMinimizedAppIds,
} from "@/store/use-workspace-store";
import { APP_CATALOG } from "@/lib/constants/app-catalog";
import { getAppIcon } from "@/lib/constants/app-icons";
import type { AppId } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TASKBAR_HEIGHT = 84;
const MAX_DESK_APPS = 8;
const DEFAULT_PINNED: AppId[] = ["notes", "timer", "todo", "ai-chat"];

export function Taskbar() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const addApp = useWorkspaceStore((s) => s.addApp);
  const setMinimized = useWorkspaceStore((s) => s.setMinimized);
  const setView = useWorkspaceStore((s) => s.setView);
  const view = useWorkspaceStore((s) => s.view);
  const workspace = useWorkspaceStore(selectActiveWorkspaceConfig);
  const minimizedAppIds = useWorkspaceStore(selectMinimizedAppIds);

  const openAppTypes = new Set(
    workspace.apps.filter((a) => !minimizedAppIds.includes(a.id)).map((a) => a.type)
  );

  // Always show default pinned, then append open apps not in default (new apps at bottom)
  const deskApps = useMemo(() => {
    const seen = new Set<AppId>();
    const result: { id: AppId; name: string }[] = [];

    for (const id of DEFAULT_PINNED) {
      seen.add(id);
      const catalog = APP_CATALOG.find((a) => a.id === id);
      if (catalog) result.push({ id: catalog.id, name: catalog.name });
    }

    for (const app of workspace.apps) {
      if (seen.has(app.type) || result.length >= MAX_DESK_APPS) continue;
      seen.add(app.type);
      const catalog = APP_CATALOG.find((a) => a.id === app.type);
      if (catalog) result.push({ id: catalog.id, name: catalog.name });
    }

    return result;
  }, [workspace.apps]);

  const filteredApps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return APP_CATALOG;
    return APP_CATALOG.filter(
      (a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
    );
  }, [search]);

  const handleAppClick = (appId: AppId) => {
    const minimizedOfType = workspace.apps.filter(
      (a) => a.type === appId && minimizedAppIds.includes(a.id)
    );
    if (minimizedOfType.length > 0) {
      setMinimized(minimizedOfType[0].id, false);
    } else {
      addApp(appId);
    }
    if (view === "home") {
      setView("workspace");
    }
  };

  const handlePickerSelect = (appId: AppId) => {
    addApp(appId);
    if (view === "home") setView("workspace");
    setPickerOpen(false);
    setSearch("");
  };

  useEffect(() => {
    if (!pickerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPickerOpen(false);
        setSearch("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pickerOpen]);

  return (
    <motion.div
      initial={{ y: TASKBAR_HEIGHT }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-1 border-t border-border/80 bg-background/90 pt-2 pb-5 backdrop-blur-md focus-mode-dim transition-opacity"
      style={{ height: TASKBAR_HEIGHT }}
    >
      <div className="flex items-center gap-2 rounded-lg px-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-xl transition-colors -ml-2 mr-2",
            pickerOpen
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          onClick={() => setPickerOpen(true)}
          aria-label="All apps"
        >
          <LayoutGrid className="size-7" />
        </motion.button>

        <div className="h-10 w-px bg-border/60" aria-hidden />

        {deskApps.map((app) => {
          const Icon = getAppIcon(app.id);
          const isOpen = openAppTypes.has(app.id);
          const hasMinimized = workspace.apps.some(
            (a) => a.type === app.id && minimizedAppIds.includes(a.id)
          );
          const isActive = isOpen || hasMinimized;
          return (
            <motion.button
              key={app.id}
              type="button"
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "flex size-14 items-center justify-center rounded-xl transition-colors",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              onClick={() => handleAppClick(app.id)}
              title={hasMinimized ? `Restore ${app.name}` : app.name}
              aria-label={hasMinimized ? `Restore ${app.name}` : `Open ${app.name}`}
            >
              <Icon className="size-7" />
            </motion.button>
          );
        })}

        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm"
                  onClick={() => {
                    setPickerOpen(false);
                    setSearch("");
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="w-[520px] max-h-[80vh] overflow-hidden rounded-xl border border-border/80 bg-card shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
                      <Search className="size-4 shrink-0 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search apps..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                        autoFocus
                      />
                    </div>
                    <div className="grid max-h-[400px] grid-cols-5 gap-3 overflow-y-auto p-4">
                      {filteredApps.map((app) => (
                        <motion.button
                          key={app.id}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-3 py-4 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent/60"
                          onClick={() => handlePickerSelect(app.id)}
                        >
                          {(() => {
                            const Icon = getAppIcon(app.id);
                            return <Icon className="size-5 text-primary" />;
                          })()}
                          <span className="min-w-0 w-full break-words text-center text-xs line-clamp-2">{app.name}</span>
                        </motion.button>
                      ))}
                    </div>
                    {filteredApps.length === 0 && (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No apps match &quot;{search}&quot;
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
      </div>
    </motion.div>
  );
}

export const TASKBAR_HEIGHT_PX = TASKBAR_HEIGHT;
