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
  /** When this changes, the scene is reloaded from file (e.g. after agent modifies it) */
  reloadTrigger?: number;
}

export function ExcalidrawBoard({ filePath, className, reloadTrigger }: ExcalidrawBoardProps) {
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const mountedRef = useRef(true);
  const loadSceneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadScene = useCallback(
    async (api: ExcalidrawImperativeAPI) => {
      try {
        const content = await readFile(filePath);
        if (!content?.trim() || !mountedRef.current) return;
        const blob = new Blob([content], { type: "application/json" });
        const scene = await loadFromBlob(blob, null, null);
        if (!mountedRef.current) return;
        const elements = scene.elements;
        const appState = scene.appState ?? undefined;
        // Excalidraw's _App must be mounted before updateScene (setState). A short delay is required.
        const runUpdate = () => {
          loadSceneTimeoutRef.current = null;
          if (!mountedRef.current) return;
          try {
            api.updateScene({ elements, appState });
          } catch {
            // ignore
          }
        };
        if (loadSceneTimeoutRef.current) clearTimeout(loadSceneTimeoutRef.current);
        loadSceneTimeoutRef.current = setTimeout(runUpdate, 100);
      } catch {
        // File not found or invalid: start with empty scene
      }
    },
    [filePath]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (loadSceneTimeoutRef.current) {
        clearTimeout(loadSceneTimeoutRef.current);
        loadSceneTimeoutRef.current = null;
      }
    };
  }, []);

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
    if (reloadTrigger == null || reloadTrigger <= 0 || !excalidrawAPIRef.current) return;
    const api = excalidrawAPIRef.current;
    let cancelled = false;
    setTimeout(() => {
      if (!cancelled) loadScene(api);
    }, 0);
    return () => {
      cancelled = true;
    };
  }, [reloadTrigger, loadScene]);

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
              // Defer to next macrotask so Excalidraw's internal _App is mounted before loadScene calls updateScene
              setTimeout(() => loadScene(api), 0);
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
