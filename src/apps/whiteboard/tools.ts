"use client";

import { readFile, writeFile } from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";

const DEFAULT_PATH = "/whiteboard/default.json";

/** Lazy-load Excalidraw (uses window, breaks SSR) */
async function getExcalidraw() {
  const mod = await import("@excalidraw/excalidraw");
  return {
    loadFromBlob: mod.loadFromBlob,
    serializeAsJSON: mod.serializeAsJSON,
    convertToExcalidrawElements: mod.convertToExcalidrawElements,
  };
}

/** Clear the default whiteboard file. Call at start of new agent run so the board starts clean. */
export async function clearWhiteboardForNewRun(): Promise<void> {
  const { serializeAsJSON } = await getExcalidraw();
  const emptyJson = serializeAsJSON([], {}, {}, "local");
  await writeFile(DEFAULT_PATH, emptyJson);
}

/**
 * Create whiteboard tools that write actual Excalidraw elements to the file.
 */
export function createWhiteboardTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "whiteboard_draw_shape",
      description:
        "Draw exactly one shape on the whiteboard (rectangle or circle). Call this tool ONCE per shape — e.g. for 'draw a rectangle' call it once with shape=rectangle.",
      appId: "whiteboard",
      parameters: {
        type: "object",
        properties: {
          shape: {
            type: "string",
            enum: ["rectangle", "circle"],
            description: "Shape type",
          },
          x: { type: "number", description: "X position in pixels" },
          y: { type: "number", description: "Y position in pixels" },
          width: { type: "number", description: "Width in pixels (optional)" },
          height: { type: "number", description: "Height in pixels (optional)" },
        },
        required: ["shape", "x", "y"],
      },
      execute: async (params) => {
        const shape = (params.shape as "rectangle" | "circle") ?? "rectangle";
        const x = Number(params.x) ?? 100;
        const y = Number(params.y) ?? 100;
        const width = Number(params.width) ?? 80;
        const height = Number(params.height) ?? 60;

        const excalidrawType = shape === "circle" ? "ellipse" : shape;
        const skeleton: Record<string, unknown> = {
          type: excalidrawType,
          x,
          y,
          width,
          height,
        };

        await appendElementsToWhiteboard(DEFAULT_PATH, [skeleton]);

        return {
          success: true,
          data: { shape, coordinates: { x, y, width, height } },
        };
      },
    },
    {
      name: "whiteboard_draw_line",
      description:
        "Draw a line or arrow on the whiteboard from (x1,y1) to (x2,y2). Call once per line/arrow.",
      appId: "whiteboard",
      parameters: {
        type: "object",
        properties: {
          shape: {
            type: "string",
            enum: ["line", "arrow"],
            description: "Line (no arrowheads) or arrow (with arrowhead at end)",
          },
          x1: { type: "number", description: "Start X in pixels" },
          y1: { type: "number", description: "Start Y in pixels" },
          x2: { type: "number", description: "End X in pixels" },
          y2: { type: "number", description: "End Y in pixels" },
        },
        required: ["shape", "x1", "y1", "x2", "y2"],
      },
      execute: async (params) => {
        const shape = (params.shape as "line" | "arrow") ?? "line";
        const x1 = Number(params.x1) ?? 0;
        const y1 = Number(params.y1) ?? 0;
        const x2 = Number(params.x2) ?? 100;
        const y2 = Number(params.y2) ?? 0;

        const skeleton: Record<string, unknown> = {
          type: shape,
          x: x1,
          y: y1,
          points: [
            [0, 0],
            [x2 - x1, y2 - y1],
          ],
        };

        await appendElementsToWhiteboard(DEFAULT_PATH, [skeleton]);

        return {
          success: true,
          data: { shape, from: { x: x1, y: y1 }, to: { x: x2, y: y2 } },
        };
      },
    },
    {
      name: "whiteboard_add_text",
      description:
        "Add exactly one text label to the whiteboard. Call this tool ONCE per label — e.g. for 'add text Ideas' call it once with text='Ideas'.",
      appId: "whiteboard",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text content" },
          x: { type: "number", description: "X position in pixels" },
          y: { type: "number", description: "Y position in pixels" },
        },
        required: ["text", "x", "y"],
      },
      execute: async (params) => {
        const text = String(params.text ?? "").trim();
        const x = Number(params.x) ?? 100;
        const y = Number(params.y) ?? 100;
        if (!text) return { success: false, error: "text is required" };

        const skeleton = { type: "text" as const, x, y, text };
        await appendElementsToWhiteboard(DEFAULT_PATH, [skeleton]);

        return {
          success: true,
          data: { text, position: { x, y } },
          // No uiUpdate: real elements are written to file; board reloads via agentDataVersion
        };
      },
    },
    {
      name: "whiteboard_clear",
      description: "Clear the whiteboard",
      appId: "whiteboard",
      parameters: {
        type: "object",
        properties: {
          wipeDuration: {
            type: "number",
            description: "Animation duration in ms (optional)",
          },
        },
        required: [],
      },
      execute: async (params) => {
        const wipeDuration = Number(params.wipeDuration) ?? 500;
        const { serializeAsJSON } = await getExcalidraw();
        const emptyJson = serializeAsJSON([], {}, {}, "local");
        await writeFile(DEFAULT_PATH, emptyJson);

        return {
          success: true,
          data: {},
          // No uiUpdate: board reloads via agentDataVersion
        };
      },
    },
  ];
}

async function appendElementsToWhiteboard(
  filePath: string,
  skeletonElements: Record<string, unknown>[]
): Promise<void> {
  const { loadFromBlob, serializeAsJSON, convertToExcalidrawElements } =
    await getExcalidraw();

  let elements: unknown[] = [];
  let appState: Record<string, unknown> = {};
  let files: Record<string, unknown> = {};

  try {
    const content = await readFile(filePath);
    if (content?.trim()) {
      const blob = new Blob([content], { type: "application/json" });
      const scene = await loadFromBlob(blob, null, null);
      elements = [...(scene.elements ?? [])];
      appState = (scene.appState ?? {}) as Record<string, unknown>;
      files = (scene.files ?? {}) as Record<string, unknown>;
    }
  } catch {
    // File doesn't exist or is invalid: start fresh
  }

  const newElements = convertToExcalidrawElements(
    skeletonElements as Parameters<typeof convertToExcalidrawElements>[0],
    { regenerateIds: true }
  );
  const merged = [...elements, ...newElements];
  // Clear selection so newly added elements don't show the blue selection box on reload
  const cleanAppState = {
    ...appState,
    selectedElementIds: {},
    selectedGroupIds: {},
    selectedLinearElement: null,
  };
  const json = serializeAsJSON(
    merged as Parameters<typeof serializeAsJSON>[0],
    cleanAppState as Parameters<typeof serializeAsJSON>[1],
    files as Parameters<typeof serializeAsJSON>[2],
    "local"
  );
  await writeFile(filePath, json);
}
