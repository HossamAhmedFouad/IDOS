"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { APP_CATALOG } from "@/lib/constants/app-catalog";
import type { AppId } from "@/lib/types";

export function AppsPicker() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const addApp = useWorkspaceStore((s) => s.addApp);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (id: AppId) => {
    addApp(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        Add app
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
        >
          <div className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Add an app to your workspace
          </div>
          <div className="grid grid-cols-3 gap-2">
            {APP_CATALOG.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => handleSelect(app.id)}
                className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
              >
                {app.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
