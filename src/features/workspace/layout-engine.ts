import type { AppInstance, WorkspaceConfig } from "@/lib/types";
import type { LayoutStrategy } from "@/lib/types/layout";
import { getAppMetadata } from "@/apps/registry";

export interface LayoutResult {
  apps: AppInstance[];
}

/**
 * Layout engine: computes pixel positions for apps based on workspace config and viewport.
 * Phase 1: floating layout only - uses positions from config or applies defaults.
 */
export function computeLayout(
  config: WorkspaceConfig,
  viewportWidth: number,
  viewportHeight: number
): LayoutResult {
  if (config.layoutStrategy === "floating") {
    return computeFloatingLayout(config.apps, viewportWidth, viewportHeight);
  }
  // Phase 2: grid, split, tiled - fallback to floating for now
  return computeFloatingLayout(config.apps, viewportWidth, viewportHeight);
}

function computeFloatingLayout(
  apps: AppInstance[],
  viewportWidth: number,
  viewportHeight: number
): LayoutResult {
  const result: AppInstance[] = apps.map((app) => {
    const metadata = getAppMetadata(app.type);
    const width = app.width ?? metadata.defaultWidth;
    const height = app.height ?? metadata.defaultHeight;
    let x = app.x;
    let y = app.y;
    // Clamp to viewport
    x = Math.max(0, Math.min(x, viewportWidth - width));
    y = Math.max(0, Math.min(y, viewportHeight - height));
    return {
      ...app,
      x,
      y,
      width,
      height,
    };
  });
  return { apps: result };
}
