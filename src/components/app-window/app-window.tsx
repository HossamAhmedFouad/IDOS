"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from "@/lib/constants/app-defaults";

interface AppWindowProps {
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: React.ReactNode;
}

type ResizeHandle =
  | "n" | "s" | "e" | "w"
  | "ne" | "nw" | "se" | "sw";

export function AppWindow({ appId, title, x, y, width, height, children }: AppWindowProps) {
  const updateAppPosition = useWorkspaceStore((s) => s.updateAppPosition);
  const updateAppSize = useWorkspaceStore((s) => s.updateAppSize);
  const removeApp = useWorkspaceStore((s) => s.removeApp);
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

  const TOP_BAR_HEIGHT = 56;
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - TOP_BAR_HEIGHT - height);
        const newX = Math.max(0, Math.min(dragStart.appX + dx, maxX));
        const newY = Math.max(0, Math.min(dragStart.appY + dy, maxY));
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
    [isDragging, dragStart, isResizing, resizeState, appId, width, height, updateAppPosition, updateAppSize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeState(null);
  }, []);

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
    <div
      className="absolute overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={{
        left: x,
        top: y,
        width,
        height,
        minWidth: MIN_WINDOW_WIDTH,
        minHeight: MIN_WINDOW_HEIGHT,
      }}
    >
      {/* Title bar - drag area */}
      <div
        className={`flex cursor-grab items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 ${isDragging ? "cursor-grabbing" : ""}`}
        onMouseDown={handleDragStart}
      >
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            removeApp(appId);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="ml-2 rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-600 dark:hover:text-zinc-100"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* App content */}
      <div className="h-[calc(100%-40px)] overflow-auto">{children}</div>

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
    </div>
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
