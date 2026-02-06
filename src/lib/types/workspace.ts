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
