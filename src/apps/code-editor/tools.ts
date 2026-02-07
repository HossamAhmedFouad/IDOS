"use client";

import { readFile, writeFile } from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";

/**
 * Create code editor tools that use the given app instance id for uiUpdate.targetId.
 */
export function createCodeEditorTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "code_editor_write",
      description: "Write content to a file in the code editor (creates or overwrites)",
      appId: "code-editor",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Full file path (e.g. /code/main.js)" },
          content: { type: "string", description: "File content" },
          animated: {
            type: "boolean",
            description: "Use typewriter effect (default: true)",
          },
        },
        required: ["path", "content"],
      },
      execute: async (params) => {
        const path = String(params.path ?? "").trim();
        const content = String(params.content ?? "");
        if (!path) return { success: false, error: "path is required" };
        await writeFile(path, content);
        const animated = params.animated !== false;
        const lines = content.split("\n");
        const startLine = 1;
        return {
          success: true,
          data: { path },
          uiUpdate: animated
            ? {
                type: "code_editor_type_code",
                targetId: appInstanceId,
                code: content,
                startLine,
                speed: 35,
                syntaxHighlight: false,
              }
            : {
                type: "code_editor_line_highlight",
                targetId: appInstanceId,
                lineNumbers: lines.length > 0 ? Array.from({ length: lines.length }, (_, i) => i + 1) : [1],
                duration: 1500,
              },
        };
      },
    },
    {
      name: "code_editor_read_file",
      description: "Read content of a file from the code editor",
      appId: "code-editor",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Full file path" },
        },
        required: ["path"],
      },
      execute: async (params) => {
        const path = String(params.path ?? "").trim();
        if (!path) return { success: false, error: "path is required" };
        const content = await readFile(path);
        const lines = content.split("\n");
        return {
          success: true,
          data: { path, content },
          uiUpdate: {
            type: "code_editor_line_highlight",
            targetId: appInstanceId,
            lineNumbers: lines.length > 0 ? [1] : [],
            duration: 1000,
          },
        };
      },
    },
    {
      name: "code_editor_highlight_lines",
      description: "Highlight specific lines in the code editor",
      appId: "code-editor",
      parameters: {
        type: "object",
        properties: {
          lineNumbers: {
            type: "array",
            items: { type: "number" },
            description: "Line numbers to highlight (1-based)",
          },
        },
        required: ["lineNumbers"],
      },
      execute: async (params) => {
        const lineNumbers = Array.isArray(params.lineNumbers)
          ? (params.lineNumbers as number[]).filter((n) => typeof n === "number" && n >= 1)
          : [];
        if (lineNumbers.length === 0) return { success: true, data: {} };
        return {
          success: true,
          data: { lineNumbers },
          uiUpdate: {
            type: "code_editor_line_highlight",
            targetId: appInstanceId,
            lineNumbers,
            duration: 2000,
          },
        };
      },
    },
  ];
}
