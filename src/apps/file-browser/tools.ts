"use client";

import {
  listDirectory,
  readFile,
  writeFile,
  moveFile,
  deleteFile,
} from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";

const MAX_READ_LENGTH = 8000;

export const fileBrowserTools: AppTool[] = [
  {
    name: "file_browser_list_directory",
    description: "List files and folders in a directory path",
    appId: "file-browser",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path (e.g. / or /notes)" },
      },
      required: ["path"],
    },
    execute: async (params) => {
      const path = String(params.path ?? "/").trim() || "/";
      const names = await listDirectory(path);
      return { success: true, data: { path, entries: names } };
    },
  },
  {
    name: "file_browser_read_file",
    description: "Read content of a file. Truncated if large.",
    appId: "file-browser",
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
      const truncated =
        content.length > MAX_READ_LENGTH
          ? content.slice(0, MAX_READ_LENGTH) + "\n...[truncated]"
          : content;
      return { success: true, data: { path, content: truncated } };
    },
  },
  {
    name: "file_browser_write_file",
    description: "Write content to a file (creates or overwrites)",
    appId: "file-browser",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Full file path" },
        content: { type: "string", description: "File content" },
      },
      required: ["path", "content"],
    },
    execute: async (params) => {
      const path = String(params.path ?? "").trim();
      const content = String(params.content ?? "");
      if (!path) return { success: false, error: "path is required" };
      await writeFile(path, content);
      return { success: true, data: { path } };
    },
  },
  {
    name: "file_browser_move_file",
    description: "Move a file or path to a new location",
    appId: "file-browser",
    parameters: {
      type: "object",
      properties: {
        oldPath: { type: "string", description: "Current path" },
        newPath: { type: "string", description: "New path" },
      },
      required: ["oldPath", "newPath"],
    },
    execute: async (params) => {
      const oldPath = String(params.oldPath ?? "").trim();
      const newPath = String(params.newPath ?? "").trim();
      if (!oldPath || !newPath)
        return { success: false, error: "oldPath and newPath are required" };
      await moveFile(oldPath, newPath);
      return { success: true, data: { oldPath, newPath } };
    },
  },
  {
    name: "file_browser_delete_file",
    description: "Delete a file at the given path",
    appId: "file-browser",
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
      await deleteFile(path);
      return { success: true, data: { path } };
    },
  },
];
