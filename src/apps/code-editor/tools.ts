"use client";

import { readFile, writeFile, listDirectory } from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useAgentStore } from "@/store/use-agent-store";
import { selectActiveWorkspaceConfig } from "@/store/use-workspace-store";

function dirname(path: string): string {
  const p = path.replace(/\/$/, "");
  const last = p.lastIndexOf("/");
  if (last <= 0) return "/";
  return p.slice(0, last);
}

function normalizePath(path: string): string {
  const p = path.replace(/\\/g, "/").trim();
  return p.startsWith("/") ? p : "/" + p;
}

/** True if path looks like a file (last segment has an extension, e.g. .html, .js). */
function pathLooksLikeFile(path: string): boolean {
  return /\.[^/]+$/.test(path.replace(/\/$/, ""));
}

/**
 * Create code editor tools that use the given app instance id for uiUpdate.targetId.
 */
export function createCodeEditorTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "code_editor_open",
      description:
        "Open the code editor at a path. Use a directory path to open that folder in the explorer; use a file path to open that file and focus the editor. Brings the code editor into view/focus.",
      appId: "code-editor",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Full path: directory (e.g. /code) to open that folder, or file (e.g. /code/main.js) to open and preview that file",
          },
        },
        required: ["path"],
      },
      execute: async (params) => {
        const raw = String(params.path ?? "").trim();
        if (!raw) return { success: false, error: "path is required" };
        const path = normalizePath(raw);

        const state = useWorkspaceStore.getState();
        const config = selectActiveWorkspaceConfig(state);
        const codeEditorApp = config.apps.find((a) => a.type === "code-editor");
        const agentStore = useAgentStore.getState();

        let openedAs: "directory" | "file";

        if (pathLooksLikeFile(path)) {
          openedAs = "file";
          const directoryPath = dirname(path);
          if (codeEditorApp) {
            state.updateAppConfig(codeEditorApp.id, {
              directoryPath,
              filePath: path,
            });
          } else {
            agentStore.setAgentCodeEditorDirectoryPath(directoryPath);
            agentStore.setLastCodeEditorFilePath(path);
            agentStore.addPathToAgentRecentCodeEditorPaths(path);
          }
        } else {
          try {
            await listDirectory(path);
            openedAs = "directory";
            if (codeEditorApp) {
              state.updateAppConfig(codeEditorApp.id, {
                directoryPath: path,
                filePath: undefined,
              });
            } else {
              agentStore.setAgentCodeEditorDirectoryPath(path);
              agentStore.setLastCodeEditorFilePath(null);
            }
          } catch {
            openedAs = "file";
            const directoryPath = dirname(path);
            if (codeEditorApp) {
              state.updateAppConfig(codeEditorApp.id, {
                directoryPath,
                filePath: path,
              });
            } else {
              agentStore.setAgentCodeEditorDirectoryPath(directoryPath);
              agentStore.setLastCodeEditorFilePath(path);
              agentStore.addPathToAgentRecentCodeEditorPaths(path);
            }
          }
        }

        return {
          success: true,
          data: { path, openedAs },
          uiUpdate: {
            type: "code_editor_line_highlight",
            targetId: appInstanceId,
            lineNumbers: [1],
            duration: 800,
          },
        };
      },
    },
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
        const normalizedPath = normalizePath(path);
        return {
          success: true,
          data: { path: normalizedPath },
          uiUpdate: animated
            ? {
                type: "code_editor_type_code",
                targetId: appInstanceId,
                code: content,
                startLine,
                speed: 35,
                syntaxHighlight: false,
                path: normalizedPath,
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
