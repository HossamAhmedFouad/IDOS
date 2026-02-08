"use client";

import React from "react";
import type { AppId, AppProps } from "@/lib/types";
import { APP_DEFAULT_SIZES } from "@/lib/constants/app-defaults";
import { getAppName } from "@/lib/constants/app-catalog";

export interface AppMetadata {
  defaultWidth: number;
  defaultHeight: number;
  supportedModes?: string[];
}

const lazy = (loader: () => Promise<{ default: React.ComponentType<AppProps> }>) =>
  React.lazy(loader);

const APP_COMPONENTS: Record<AppId, React.LazyExoticComponent<React.ComponentType<AppProps>>> = {
  notes: lazy(() => import("./notes").then((m) => ({ default: m.NotesApp }))),
  timer: lazy(() => import("./timer").then((m) => ({ default: m.TimerApp }))),
  todo: lazy(() => import("./todo").then((m) => ({ default: m.TodoApp }))),
  "code-editor": lazy(() => import("./code-editor").then((m) => ({ default: m.CodeEditorApp }))),
  quiz: lazy(() => import("./quiz").then((m) => ({ default: m.QuizApp }))),
  email: lazy(() => import("./email").then((m) => ({ default: m.EmailApp }))),
  calendar: lazy(() => import("./calendar").then((m) => ({ default: m.CalendarApp }))),
  "file-browser": lazy(() => import("./file-browser").then((m) => ({ default: m.FileBrowserApp }))),
  whiteboard: lazy(() => import("./whiteboard").then((m) => ({ default: m.WhiteboardApp }))),
  "ai-chat": lazy(() => import("./ai-chat").then((m) => ({ default: m.AIChatApp }))),
  "explanation-panel": lazy(() =>
    import("./explanation-panel").then((m) => ({ default: m.ExplanationPanelApp }))
  ),
  terminal: lazy(() => import("./terminal").then((m) => ({ default: m.TerminalApp }))),
};

function PlaceholderApp({ appType }: AppProps) {
  const name = getAppName(appType);
  return (
    <div className="flex h-full items-center justify-center p-4">
      <span className="text-muted-foreground">{name}</span>
    </div>
  );
}

export function getAppComponent(id: AppId): React.ComponentType<AppProps> {
  return APP_COMPONENTS[id] ?? PlaceholderApp;
}

export function getAppMetadata(id: AppId): AppMetadata {
  const sizes = APP_DEFAULT_SIZES[id];
  return {
    defaultWidth: sizes?.width ?? 400,
    defaultHeight: sizes?.height ?? 350,
  };
}
