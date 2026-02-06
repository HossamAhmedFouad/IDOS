import type { SystemMode } from "./modes";

/**
 * Application identifiers for the app registry.
 */
export type AppId =
  | "notes"
  | "timer"
  | "todo"
  | "code-editor"
  | "quiz"
  | "email"
  | "chat"
  | "calendar"
  | "file-browser"
  | "whiteboard"
  | "ai-chat"
  | "explanation-panel";

/**
 * Position and dimensions for an app window (in pixels).
 */
export interface AppBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * App-specific configuration (e.g., file path, theme).
 */
export interface AppConfig {
  filePath?: string;
  directoryPath?: string;
  [key: string]: unknown;
}

/**
 * An application instance in the workspace.
 */
export interface AppInstance extends AppBounds {
  id: string;
  type: AppId;
  config?: AppConfig;
}

/**
 * Props passed to every app component.
 */
export interface AppProps {
  id: string;
  appType: AppId;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  activeModes: SystemMode[];
  config?: AppConfig;
}
