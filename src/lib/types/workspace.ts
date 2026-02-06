import type { AppInstance } from "./app";
import type { LayoutStrategy } from "./layout";
import type { SystemMode } from "./modes";

/**
 * Complete workspace configuration.
 */
export interface WorkspaceConfig {
  apps: AppInstance[];
  layoutStrategy: LayoutStrategy;
  modes: SystemMode[];
}

/**
 * Workspace entity with stable id and optional label (e.g. truncated intent text).
 */
export interface Workspace {
  id: string;
  label?: string;
  config: WorkspaceConfig;
}
