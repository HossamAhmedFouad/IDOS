import type { AppId } from "@/lib/types";

export interface AppCatalogEntry {
  id: AppId;
  name: string;
}

/** Single source of truth for all available apps and their display names */
export const APP_CATALOG: AppCatalogEntry[] = [
  { id: "notes", name: "Notes" },
  { id: "timer", name: "Timer" },
  { id: "todo", name: "Todo" },
  { id: "code-editor", name: "Code Editor" },
  { id: "quiz", name: "Quiz" },
  { id: "email", name: "Email" },
  { id: "calendar", name: "Calendar" },
  { id: "file-browser", name: "File Browser" },
  { id: "whiteboard", name: "Whiteboard" },
  { id: "ai-chat", name: "AI Chat" },
  { id: "explanation-panel", name: "Explanation Panel" },
];

export function getAppName(id: AppId): string {
  return APP_CATALOG.find((a) => a.id === id)?.name ?? id;
}
