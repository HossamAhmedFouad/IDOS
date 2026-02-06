"use client";

import type { AppProps } from "@/lib/types";
import { HelpCircle, Lightbulb, BookOpen } from "lucide-react";

const TIPS = [
  {
    icon: HelpCircle,
    title: "Describe what you want",
    text: "Type a natural language intent like 'take notes and set a timer' or 'study with flashcards and AI chat'.",
  },
  {
    icon: Lightbulb,
    title: "Use system modes",
    text: "Toggle Dark mode for night work, Focus mode for deep work, and Do Not Disturb for meetings.",
  },
  {
    icon: BookOpen,
    title: "Manage workspaces",
    text: "Create multiple workspaces, rename them, switch between them, and add apps from the taskbar.",
  },
];

export function ExplanationPanelApp({ activeModes }: AppProps) {
  const isFocus = activeModes?.includes("focus");

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        How to use Intent-Driven OS
      </h3>
      <ul className="space-y-4">
        {TIPS.map((tip, i) => {
          const Icon = tip.icon;
          return (
            <li
              key={i}
              className={`rounded-lg border p-4 ${
                isFocus ? "border-border bg-muted/50" : "border-border bg-card"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-4 text-primary" aria-hidden />
                <span className="text-sm font-medium text-foreground">
                  {tip.title}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{tip.text}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground">
          This panel provides contextual help. No file storage is used. Content adapts based on
          active system modes.
        </p>
      </div>
    </div>
  );
}
