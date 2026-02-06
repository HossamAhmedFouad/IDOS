"use client";

import type { AppId, AppProps } from "@/lib/types";
import { APP_DEFAULT_SIZES } from "@/lib/constants/app-defaults";
import { getAppName } from "@/lib/constants/app-catalog";
import { NotesApp } from "./notes";
import { TimerApp } from "./timer";
import { TodoApp } from "./todo";
import { AIChatApp } from "./ai-chat";
import { EmailApp } from "./email";

export interface AppMetadata {
  defaultWidth: number;
  defaultHeight: number;
  supportedModes?: string[];
}

const APP_COMPONENTS: Record<AppId, React.ComponentType<AppProps>> = {
  notes: NotesApp,
  timer: TimerApp,
  todo: TodoApp,
  "code-editor": PlaceholderApp,
  quiz: PlaceholderApp,
  email: EmailApp,
  chat: PlaceholderApp,
  calendar: PlaceholderApp,
  "file-browser": PlaceholderApp,
  whiteboard: PlaceholderApp,
  "ai-chat": AIChatApp,
  "explanation-panel": PlaceholderApp,
};

function PlaceholderApp({ appType }: AppProps) {
  const name = getAppName(appType);
  return (
    <div className="flex h-full items-center justify-center p-4">
      <span className="text-zinc-500 dark:text-zinc-400">{name} (Phase 2)</span>
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
