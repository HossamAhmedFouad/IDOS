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
      name: "whiteboard_draw",
      description:
        "Draw exactly one shape on the whiteboard (rectangle, circle, line, arrow). Call this tool ONCE per shape — e.g. for 'draw a rectangle' call it once with shape=rectangle.",
      appId: "whiteboard",
      parameters: {
        type: "object",
        properties: {
          shape: {
            type: "string",
            enum: ["rectangle", "circle", "line", "arrow"],
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
        const shape = (params.shape as "rectangle" | "circle" | "line" | "arrow") ?? "rectangle";
        const x = Number(params.x) ?? 100;
        const y = Number(params.y) ?? 100;
        const width = Number(params.width) ?? 80;
        const height = Number(params.height) ?? 60;

        const excalidrawType = shape === "circle" ? "ellipse" : shape;
        const skeleton: Record<string, unknown> = {
          type: excalidrawType,
          x,
          y,
        };
        if (shape === "rectangle" || shape === "circle") {
          skeleton.width = width;
          skeleton.height = height;
        }

        await appendElementsToWhiteboard(DEFAULT_PATH, [skeleton]);

        return {
          success: true,
          data: { shape, coordinates: { x, y, width, height } },
          // No uiUpdate: real elements are written to file; board reloads via agentDataVersion
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
