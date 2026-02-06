import type { AppInstance, WorkspaceConfig } from "@/lib/types";
import type { LayoutStrategy } from "@/lib/types/layout";
import { getAppMetadata } from "@/apps/registry";

export interface LayoutResult {
  apps: AppInstance[];
}

const GRID_GAP = 8;
const GRID_COLS = 3;

/**
 * Layout engine: computes pixel positions for apps based on workspace config and viewport.
 */
export function computeLayout(
  config: WorkspaceConfig,
  viewportWidth: number,
  viewportHeight: number
): LayoutResult {
  switch (config.layoutStrategy) {
    case "floating":
      return computeFloatingLayout(config.apps, viewportWidth, viewportHeight);
    case "grid":
      return computeGridLayout(config.apps, viewportWidth, viewportHeight);
    case "split":
      return computeSplitLayout(config.apps, viewportWidth, viewportHeight);
    case "tiled":
      return computeTiledLayout(config.apps, viewportWidth, viewportHeight);
    default:
      return computeFloatingLayout(config.apps, viewportWidth, viewportHeight);
  }
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
    x = Math.max(0, Math.min(x, viewportWidth - width));
    y = Math.max(0, Math.min(y, viewportHeight - height));
    return { ...app, x, y, width, height };
  });
  return { apps: result };
}

function computeGridLayout(
  apps: AppInstance[],
  viewportWidth: number,
  viewportHeight: number
): LayoutResult {
  if (apps.length === 0) return { apps: [] };
  const cols = GRID_COLS;
  const rows = Math.ceil(apps.length / cols);
  const gap = GRID_GAP;
  const cellWidth = (viewportWidth - gap * (cols - 1)) / cols;
  const cellHeight = (viewportHeight - gap * (rows - 1)) / rows;
  const result: AppInstance[] = apps.map((app, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * (cellWidth + gap);
    const y = row * (cellHeight + gap);
    const width = Math.max(200, cellWidth);
    const height = Math.max(150, cellHeight);
    return { ...app, x, y, width, height };
  });
  return { apps: result };
}

function computeSplitLayout(
  apps: AppInstance[],
  viewportWidth: number,
  viewportHeight: number
): LayoutResult {
  if (apps.length === 0) return { apps: [] };
  if (apps.length === 1) {
    const metadata = getAppMetadata(apps[0].type);
    return {
      apps: [
        {
          ...apps[0],
          x: 0,
          y: 0,
          width: viewportWidth,
          height: viewportHeight,
        },
      ],
    };
  }
  const regions = splitRecursive(0, 0, viewportWidth, viewportHeight, apps.length);
  return {
    apps: apps.map((app, i) => ({
      ...app,
      ...regions[i],
    })),
  };
}

function splitRecursive(
  x: number,
  y: number,
  w: number,
  h: number,
  count: number
): Array<{ x: number; y: number; width: number; height: number }> {
  if (count <= 0) return [];
  if (count === 1) return [{ x, y, width: w, height: h }];
  const vertical = w >= h;
  const half = Math.floor(count / 2);
  const rest = count - half;
  if (vertical) {
    const leftW = Math.floor((w * half) / count);
    const rightW = w - leftW;
    return [
      ...splitRecursive(x, y, leftW, h, half),
      ...splitRecursive(x + leftW, y, rightW, h, rest),
    ];
  } else {
    const topH = Math.floor((h * half) / count);
    const bottomH = h - topH;
    return [
      ...splitRecursive(x, y, w, topH, half),
      ...splitRecursive(x, y + topH, w, bottomH, rest),
    ];
  }
}

function computeTiledLayout(
  apps: AppInstance[],
  viewportWidth: number,
  viewportHeight: number
): LayoutResult {
  return computeSplitLayout(apps, viewportWidth, viewportHeight);
}
