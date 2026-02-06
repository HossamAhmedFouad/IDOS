"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  Excalidraw,
  loadFromBlob,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { readFile, writeFile } from "@/lib/file-system";

import "@excalidraw/excalidraw/index.css";

const SAVE_DEBOUNCE_MS = 600;

export interface ExcalidrawBoardProps {
  filePath: string;
  className?: string;
}

export function ExcalidrawBoard({ filePath, className }: ExcalidrawBoardProps) {
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const loadScene = useCallback(
    async (api: ExcalidrawImperativeAPI) => {
      try {
        const content = await readFile(filePath);
        if (!content?.trim()) return;
        const blob = new Blob([content], { type: "application/json" });
        const scene = await loadFromBlob(blob, null, null);
        api.updateScene({
          elements: scene.elements,
          appState: scene.appState ?? undefined,
        });
      } catch {
        // File not found or invalid: start with empty scene
      }
    },
    [filePath]
  );

  const scheduleSave = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        saveTimeoutRef.current = null;
        try {
          const json = serializeAsJSON(
            elements as ExcalidrawElement[],
            appState,
            files ?? {},
            "local"
          );
          await writeFile(filePath, json);
        } catch {
          // ignore write errors
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [filePath]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasSize = size.width > 0 && size.height > 0;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: "100%",
        width: "100%",
        overflow: "hidden",
        minHeight: 0,
        position: "relative",
      }}
    >
      {hasSize && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: size.width,
            height: size.height,
            overflow: "hidden",
          }}
        >
          <Excalidraw
            excalidrawAPI={(api) => {
              excalidrawAPIRef.current = api;
              loadScene(api);
            }}
            onChange={(elements, appState, files) => {
              scheduleSave(elements, appState, files);
            }}
          />
        </div>
      )}
    </div>
  );
}
