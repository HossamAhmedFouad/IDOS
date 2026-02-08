"use client";

import {
  listDirectory,
  readFile,
  writeFile,
  moveFile,
  deleteFile,
  deleteDirectory,
  deletePath,
  createDirectory,
  copyFile,
} from "@/lib/file-system";
import type { AppTool, AppToolParameters } from "@/lib/types/agent";

const MAX_READ_LENGTH = 8000;

/**
 * Create file browser tools that use the given app instance id for uiUpdate.targetId.
 */
export function createFileBrowserTools(appInstanceId: string): AppTool[] {
  return [
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
        return {
          success: true,
          data: { path, entries: names },
          uiUpdate: {
            type: "file_browser_folder_expand",
            targetId: appInstanceId,
            folderPath: path,
            animated: true,
          },
        };
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
        return {
          success: true,
          data: { path, content: truncated },
          uiUpdate: {
            type: "file_browser_file_highlight_path",
            targetId: appInstanceId,
            filePath: path,
            breadcrumb: true,
          },
        };
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
        const lastSlash = path.lastIndexOf("/");
        const parentPath = lastSlash <= 0 ? "/" : path.slice(0, lastSlash);
        return {
          success: true,
          data: { path },
          uiUpdate: {
            type: "file_browser_create_file",
            targetId: appInstanceId,
            filePath: path,
            fileType: "file",
            parentPath,
          },
        };
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
        const toSlash = newPath.lastIndexOf("/");
        const toPath = toSlash <= 0 ? "/" : newPath.slice(0, toSlash);
        return {
          success: true,
          data: { oldPath, newPath },
          uiUpdate: {
            type: "file_browser_move_animation",
            targetId: appInstanceId,
            fromPath: oldPath,
            toPath,
            duration: 500,
          },
        };
      },
    },
    {
      name: "file_browser_delete_file",
      description: "Delete a file or directory at the given path. For directories, removes the folder and all its contents.",
      appId: "file-browser",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Full file or directory path (e.g. /notes/foo.txt or /notes/archive)" },
        },
        required: ["path"],
      },
      execute: async (params) => {
        const path = String(params.path ?? "").trim();
        if (!path) return { success: false, error: "path is required" };
        try {
          const kind = await deletePath(path);
          return { success: true, data: { path, deletedAs: kind } };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : "Failed to delete" };
        }
      },
    },
    {
      name: "file_browser_delete_directory",
      description: "Delete a directory and all its contents. Use when you know the path is a folder. For files or unknown paths, use file_browser_delete_file instead.",
      appId: "file-browser",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to remove (e.g. /notes/archive)" },
        },
        required: ["path"],
      },
      execute: async (params) => {
        const path = String(params.path ?? "").trim();
        if (!path) return { success: false, error: "path is required" };
        try {
          await deleteDirectory(path);
          return { success: true, data: { path } };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : "Failed to delete directory" };
        }
      },
    },
    {
      name: "file_browser_copy_file",
      description: "Copy a file to a new location. The original file is kept.",
      appId: "file-browser",
      parameters: {
        type: "object",
        properties: {
          sourcePath: { type: "string", description: "Path of the file to copy" },
          destinationPath: { type: "string", description: "Path for the copy" },
        },
        required: ["sourcePath", "destinationPath"],
      },
      execute: async (params) => {
        const sourcePath = String(params.sourcePath ?? "").trim();
        const destinationPath = String(params.destinationPath ?? "").trim();
        if (!sourcePath || !destinationPath)
          return { success: false, error: "sourcePath and destinationPath are required" };
        await copyFile(sourcePath, destinationPath);
        const lastSlash = destinationPath.lastIndexOf("/");
        const parentPath = lastSlash <= 0 ? "/" : destinationPath.slice(0, lastSlash);
        return {
          success: true,
          data: { sourcePath, destinationPath },
          uiUpdate: {
            type: "file_browser_create_file",
            targetId: appInstanceId,
            filePath: destinationPath,
            fileType: "file",
            parentPath,
          },
        };
      },
    },
    {
      name: "file_browser_create_directory",
      description: "Create a directory (folder) at the given path. Use before moving or writing files into a new folder.",
      appId: "file-browser",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path (e.g. /notes/archive or /notes/2024)" },
        },
        required: ["path"],
      },
      execute: async (params) => {
        const path = String(params.path ?? "").trim();
        if (!path) return { success: false, error: "path is required" };
        await createDirectory(path);
        return {
          success: true,
          data: { path },
          uiUpdate: {
            type: "file_browser_folder_expand",
            targetId: appInstanceId,
            folderPath: path,
            animated: true,
          },
        };
      },
    },
    {
      name: "file_browser_batch_move",
      description: "Move multiple files in one call. Provide an array of { oldPath, newPath } pairs. Returns which paths succeeded and which failed.",
      appId: "file-browser",
      parameters: {
        type: "object",
        properties: {
          operations: {
            type: "array",
            description: "List of move operations",
            items: {
              type: "object",
              properties: {
                oldPath: { type: "string", description: "Current path" },
                newPath: { type: "string", description: "New path" },
              },
              required: ["oldPath", "newPath"],
            },
          },
        },
        required: ["operations"],
      } as AppToolParameters,
      execute: async (params) => {
        const raw = params.operations;
        const operations = Array.isArray(raw)
          ? raw.map((op: unknown) =>
              op && typeof op === "object" && "oldPath" in op && "newPath" in op
                ? { oldPath: String((op as { oldPath: unknown }).oldPath).trim(), newPath: String((op as { newPath: unknown }).newPath).trim() }
                : null
            ).filter((x): x is { oldPath: string; newPath: string } => x !== null && x.oldPath !== "" && x.newPath !== "")
          : [];
        if (operations.length === 0) return { success: false, error: "At least one operation with oldPath and newPath is required" };
        const succeeded: string[] = [];
        const failed: { path: string; error: string }[] = [];
        for (const { oldPath, newPath } of operations) {
          try {
            await moveFile(oldPath, newPath);
            succeeded.push(oldPath);
          } catch (err) {
            failed.push({ path: oldPath, error: err instanceof Error ? err.message : String(err) });
          }
        }
        const lastOp = operations[operations.length - 1];
        const toPath = lastOp ? (lastOp.newPath.lastIndexOf("/") <= 0 ? "/" : lastOp.newPath.slice(0, lastOp.newPath.lastIndexOf("/"))) : "/";
        return {
          success: failed.length === 0,
          data: { succeeded, failed, count: operations.length },
          uiUpdate: succeeded.length > 0
            ? { type: "file_browser_folder_expand", targetId: appInstanceId, folderPath: toPath, animated: true }
            : undefined,
        };
      },
    },
    {
      name: "file_browser_batch_delete",
      description: "Delete multiple files or directories in one call. Provide an array of paths (each can be a file or a directory; directories are removed with their contents). Returns which paths succeeded and which failed.",
      appId: "file-browser",
      parameters: {
        type: "object",
        properties: {
          paths: {
            type: "array",
            description: "List of file paths to delete",
            items: { type: "string" },
          },
        },
        required: ["paths"],
      },
      execute: async (params) => {
        const raw = params.paths;
        const paths = Array.isArray(raw)
          ? raw.map((p) => String(p).trim()).filter((p) => p.length > 0)
          : [];
        if (paths.length === 0) return { success: false, error: "At least one path is required" };
        const succeeded: string[] = [];
        const failed: { path: string; error: string }[] = [];
        for (const path of paths) {
          try {
            await deletePath(path);
            succeeded.push(path);
          } catch (err) {
            failed.push({ path, error: err instanceof Error ? err.message : String(err) });
          }
        }
        return {
          success: failed.length === 0,
          data: { succeeded, failed, count: paths.length },
        };
      },
    },
    {
      name: "file_browser_batch_create_directories",
      description: "Create multiple directories in one call. Provide an array of directory paths (e.g. ['/notes/2024', '/notes/2025']). Returns which paths succeeded and which failed.",
      appId: "file-browser",
      parameters: {
        type: "object",
        properties: {
          paths: {
            type: "array",
            description: "List of directory paths to create",
            items: { type: "string" },
          },
        },
        required: ["paths"],
      },
      execute: async (params) => {
        const raw = params.paths;
        const paths = Array.isArray(raw)
          ? raw.map((p) => String(p).trim()).filter((p) => p.length > 0)
          : [];
        if (paths.length === 0) return { success: false, error: "At least one path is required" };
        const succeeded: string[] = [];
        const failed: { path: string; error: string }[] = [];
        for (const path of paths) {
          try {
            await createDirectory(path);
            succeeded.push(path);
          } catch (err) {
            failed.push({ path, error: err instanceof Error ? err.message : String(err) });
          }
        }
        const lastPath = paths[paths.length - 1];
        return {
          success: failed.length === 0,
          data: { succeeded, failed, count: paths.length },
          uiUpdate: succeeded.length > 0 && lastPath
            ? { type: "file_browser_folder_expand", targetId: appInstanceId, folderPath: lastPath, animated: true }
            : undefined,
        };
      },
    },
    {
      name: "file_browser_batch_copy",
      description: "Copy multiple files in one call. Provide an array of { sourcePath, destinationPath } pairs. Returns which operations succeeded and which failed.",
      appId: "file-browser",
      parameters: {
        type: "object",
        properties: {
          operations: {
            type: "array",
            description: "List of copy operations",
            items: {
              type: "object",
              properties: {
                sourcePath: { type: "string", description: "Path of the file to copy" },
                destinationPath: { type: "string", description: "Path for the copy" },
              },
              required: ["sourcePath", "destinationPath"],
            },
          },
        },
        required: ["operations"],
      } as AppToolParameters,
      execute: async (params) => {
        const raw = params.operations;
        const operations = Array.isArray(raw)
          ? raw.map((op: unknown) =>
              op && typeof op === "object" && "sourcePath" in op && "destinationPath" in op
                ? {
                    sourcePath: String((op as { sourcePath: unknown }).sourcePath).trim(),
                    destinationPath: String((op as { destinationPath: unknown }).destinationPath).trim(),
                  }
                : null
            ).filter((x): x is { sourcePath: string; destinationPath: string } => x !== null && x.sourcePath !== "" && x.destinationPath !== "")
          : [];
        if (operations.length === 0) return { success: false, error: "At least one operation with sourcePath and destinationPath is required" };
        const succeeded: string[] = [];
        const failed: { path: string; error: string }[] = [];
        for (const { sourcePath, destinationPath } of operations) {
          try {
            await copyFile(sourcePath, destinationPath);
            succeeded.push(sourcePath);
          } catch (err) {
            failed.push({ path: sourcePath, error: err instanceof Error ? err.message : String(err) });
          }
        }
        const lastOp = operations[operations.length - 1];
        const parentPath = lastOp && lastOp.destinationPath.lastIndexOf("/") > 0 ? lastOp.destinationPath.slice(0, lastOp.destinationPath.lastIndexOf("/")) : "/";
        return {
          success: failed.length === 0,
          data: { succeeded, failed, count: operations.length },
          uiUpdate: succeeded.length > 0
            ? { type: "file_browser_folder_expand", targetId: appInstanceId, folderPath: parentPath, animated: true }
            : undefined,
        };
      },
    },
  ];
}
