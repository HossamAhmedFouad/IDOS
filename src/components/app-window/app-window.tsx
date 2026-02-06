"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from "@/lib/constants/app-defaults";
import { getAppIcon } from "@/lib/constants/app-icons";
import { TASKBAR_HEIGHT_PX } from "@/components/taskbar";
import { Button } from "@/components/ui/button";
import type { AppId } from "@/lib/types";
import { Minus, X } from "lucide-react";

const TOP_BAR_HEIGHT = 48;

const windowTransition = { type: "spring" as const, stiffness: 300, damping: 30 };

interface OtherAppBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AppWindowProps {
  appId: string;
  appType: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  showMinimize: boolean;
  otherApps?: OtherAppBounds[];
  children: React.ReactNode;
}

type ResizeHandle =
  | "n" | "s" | "e" | "w"
  | "ne" | "nw" | "se" | "sw";

const SNAP_GRID_SIZE = 10;
const MAGNETIC_THRESHOLD = 5;

function snapToGrid(val: number): number {
  return Math.round(val / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
}

function applyMagneticSnap(
  x: number,
  y: number,
  width: number,
  height: number,
  others: OtherAppBounds[]
): { x: number; y: number } {
  let outX = x;
  let outY = y;
  const threshold = MAGNETIC_THRESHOLD;

  for (const o of others) {
    const oRight = o.x + o.width;
    const oBottom = o.y + o.height;
    const myRight = x + width;
    const myBottom = y + height;

    if (Math.abs(x - oRight) <= threshold) outX = oRight;
    if (Math.abs(myRight - o.x) <= threshold) outX = o.x - width;
    if (Math.abs(x - o.x) <= threshold) outX = o.x;

    if (Math.abs(y - oBottom) <= threshold) outY = oBottom;
    if (Math.abs(myBottom - o.y) <= threshold) outY = o.y - height;
    if (Math.abs(y - o.y) <= threshold) outY = o.y;
  }

  return { x: outX, y: outY };
}

export function AppWindow({ appId, appType, title, x, y, width, height, showMinimize, otherApps = [], children }: AppWindowProps) {
  const updateAppPosition = useWorkspaceStore((s) => s.updateAppPosition);
  const snapToGridEnabled = useWorkspaceStore((s) => s.snapToGrid);
  const updateAppSize = useWorkspaceStore((s) => s.updateAppSize);
  const removeApp = useWorkspaceStore((s) => s.removeApp);
  const setMinimized = useWorkspaceStore((s) => s.setMinimized);
  const AppIcon = getAppIcon(appType);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, appX: 0, appY: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeState, setResizeState] = useState<{
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startAppX: number;
    startAppY: number;
  } | null>(null);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY, appX: x, appY: y });
    },
    [x, y]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - TOP_BAR_HEIGHT - TASKBAR_HEIGHT_PX - height);
        let newX = Math.max(0, Math.min(dragStart.appX + dx, maxX));
        let newY = Math.max(0, Math.min(dragStart.appY + dy, maxY));
        const snapped = applyMagneticSnap(newX, newY, width, height, otherApps);
        newX = snapped.x;
        newY = snapped.y;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        updateAppPosition(appId, newX, newY);
      } else if (isResizing && resizeState) {
        const { handle, startX, startY, startW, startH, startAppX, startAppY } = resizeState;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newX = startAppX;
        let newY = startAppY;
        let newW = startW;
        let newH = startH;

        if (handle.includes("e")) {
          newW = Math.max(MIN_WINDOW_WIDTH, startW + dx);
        }
        if (handle.includes("w")) {
          const dw = Math.min(dx, startW - MIN_WINDOW_WIDTH);
          newX = startAppX + dw;
          newW = startW - dw;
        }
        if (handle.includes("s")) {
          newH = Math.max(MIN_WINDOW_HEIGHT, startH + dy);
        }
        if (handle.includes("n")) {
          const dh = Math.min(dy, startH - MIN_WINDOW_HEIGHT);
          newY = startAppY + dh;
          newH = startH - dh;
        }

        updateAppSize(appId, newW, newH, newX, newY);
      }
    },
    [isDragging, dragStart, isResizing, resizeState, appId, width, height, otherApps, updateAppPosition, updateAppSize]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && snapToGridEnabled) {
      const state = useWorkspaceStore.getState();
      const config = state.workspaces.find((w) => w.id === state.activeWorkspaceId)?.config;
      const app = config?.apps.find((a) => a.id === appId);
      if (app) {
        const snappedX = snapToGrid(app.x);
        const snappedY = snapToGrid(app.y);
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - TOP_BAR_HEIGHT - TASKBAR_HEIGHT_PX - height);
        updateAppPosition(appId, Math.min(snappedX, maxX), Math.min(snappedY, maxY));
      }
    }
    setIsDragging(false);
    setIsResizing(false);
    setResizeState(null);
  }, [isDragging, snapToGridEnabled, width, appId, updateAppPosition]);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleResizeStart = useCallback(
    (handle: ResizeHandle) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeState({
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: width,
        startH: height,
        startAppX: x,
        startAppY: y,
      });
    },
    [width, height, x, y]
  );

  const resizeHandles: ResizeHandle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={windowTransition}
      className="absolute overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      style={{
        left: x,
        top: y,
        width,
        height,
        minWidth: MIN_WINDOW_WIDTH,
        minHeight: MIN_WINDOW_HEIGHT,
      }}
    >
      {/* Title bar - logo, drag area, minimize, close */}
      <div
        className={`flex cursor-grab items-center gap-2 border-b border-border/80 bg-muted/60 px-3 py-2 backdrop-blur-sm ${isDragging ? "cursor-grabbing" : ""}`}
        onMouseDown={handleDragStart}
      >
        <AppIcon className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {showMinimize && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMinimized(appId, true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label="Minimize"
            >
              <Minus className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeApp(appId);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* App content */}
      <div className="h-[calc(100%-40px)] overflow-auto bg-card">{children}</div>

      {/* Resize handles */}
      {resizeHandles.map((handle) => (
        <div
          key={handle}
          className="absolute bg-transparent"
          style={{
            ...getResizeHandleStyle(handle, width, height),
          }}
          onMouseDown={handleResizeStart(handle)}
        />
      ))}
    </motion.div>
  );
}

function getResizeHandleStyle(
  handle: ResizeHandle,
  width: number,
  height: number
): React.CSSProperties {
  const size = 8;
  const half = size / 2;
  const isCorner = handle.length === 2;
  const w = isCorner ? size : handle.includes("e") || handle.includes("w") ? size : width - size * 2;
  const h = isCorner ? size : handle.includes("n") || handle.includes("s") ? size : height - size * 2;
  let left = half;
  let top = half;
  if (handle.includes("e")) left = width - half;
  else if (handle.includes("w")) left = -half;
  if (handle.includes("s")) top = height - half;
  else if (handle.includes("n")) top = -half;
  return {
    position: "absolute" as const,
    width: w,
    height: h,
    left,
    top,
    zIndex: 10,
    cursor:
      handle === "n" ? "n-resize" :
      handle === "s" ? "s-resize" :
      handle === "e" ? "e-resize" :
      handle === "w" ? "w-resize" :
      handle === "ne" ? "ne-resize" :
      handle === "nw" ? "nw-resize" :
      handle === "se" ? "se-resize" :
      "sw-resize",
  };
}
