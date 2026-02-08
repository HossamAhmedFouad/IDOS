/**
 * Public File System API for IDOS applications.
 * Applications interact exclusively through this API.
 */

import * as idb from "./idb-adapter";
import type { FileMetadata } from "@/lib/types/file-system";

function normalizePath(path: string): string {
  let p = path.replace(/\\/g, "/").trim();
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

export async function readFile(path: string): Promise<string> {
  const normalized = normalizePath(path);
  const record = await idb.get(normalized);
  if (!record) throw new Error(`File not found: ${normalized}`);
  return record.content;
}

export async function writeFile(path: string, content: string): Promise<void> {
  const normalized = normalizePath(path);
  await ensureParentDir(normalized);
  await idb.set(normalized, content);
}

async function ensureParentDir(path: string): Promise<void> {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash <= 0) return;
  const parent = path.slice(0, lastSlash);
  if (!parent) return;
  // Directories are implicit; we don't store them separately.
  // Just ensure we can list the parent. No-op for now.
}

/** Hidden placeholder file used to mark empty directories. Filtered from listDirectory. */
const DIR_PLACEHOLDER = ".idos-dir";

export async function createDirectory(path: string): Promise<void> {
  const normalized = normalizePath(path);
  const placeholderPath = normalized.endsWith("/")
    ? normalized + DIR_PLACEHOLDER
    : normalized + "/" + DIR_PLACEHOLDER;
  await ensureParentDir(placeholderPath);
  await idb.set(placeholderPath, "");
}

export async function listDirectory(path: string): Promise<string[]> {
  const normalized = normalizePath(path);
  const dirPrefix = normalized.endsWith("/") ? normalized : normalized + "/";
  const allKeys = await idb.keys(dirPrefix);

  const seen = new Set<string>();
  for (const fullPath of allKeys) {
    const relative = fullPath.slice(dirPrefix.length);
    const firstSegment = relative.split("/")[0];
    if (firstSegment && firstSegment !== DIR_PLACEHOLDER) seen.add(firstSegment);
  }
  return Array.from(seen).sort();
}

export async function deleteFile(path: string): Promise<void> {
  const normalized = normalizePath(path);
  const record = await idb.get(normalized);
  if (!record) throw new Error(`File not found: ${normalized}`);
  await idb.remove(normalized);
}

/** Recursively deletes a directory and all its contents (files and subdirectories). */
export async function deleteDirectory(path: string): Promise<void> {
  const normalized = normalizePath(path);
  const dirPrefix = normalized.endsWith("/") ? normalized : normalized + "/";
  const allKeys = await idb.keys(dirPrefix);
  for (const fullPath of allKeys) {
    await idb.remove(fullPath);
  }
  const placeholderPath = dirPrefix + DIR_PLACEHOLDER;
  try {
    await idb.remove(placeholderPath);
  } catch {
    // Placeholder may not exist for dirs that had files
  }
}

/**
 * Delete a path that may be either a file or a directory.
 * - If the path is an exact file key, removes that file.
 * - If the path has keys under it (directory), removes the directory and all contents.
 * - If the path does not exist, throws.
 */
export async function deletePath(path: string): Promise<"file" | "directory"> {
  const normalized = normalizePath(path);
  const record = await idb.get(normalized);
  if (record) {
    await idb.remove(normalized);
    return "file";
  }
  const dirPrefix = normalized.endsWith("/") ? normalized : normalized + "/";
  const allKeys = await idb.keys(dirPrefix);
  if (allKeys.length === 0) {
    throw new Error(`Path not found: ${normalized}`);
  }
  for (const fullPath of allKeys) {
    await idb.remove(fullPath);
  }
  const placeholderPath = dirPrefix + DIR_PLACEHOLDER;
  try {
    await idb.remove(placeholderPath);
  } catch {
    // placeholder may not exist
  }
  return "directory";
}

export async function moveFile(oldPath: string, newPath: string): Promise<void> {
  const oldNorm = normalizePath(oldPath);
  const newNorm = normalizePath(newPath);
  const record = await idb.get(oldNorm);
  if (!record) throw new Error(`File not found: ${oldNorm}`);
  await idb.set(newNorm, record.content);
  await idb.remove(oldNorm);
}

export async function copyFile(sourcePath: string, destinationPath: string): Promise<void> {
  const sourceNorm = normalizePath(sourcePath);
  const destNorm = normalizePath(destinationPath);
  const record = await idb.get(sourceNorm);
  if (!record) throw new Error(`File not found: ${sourceNorm}`);
  await ensureParentDir(destNorm);
  await idb.set(destNorm, record.content);
}

export async function getMetadata(path: string): Promise<FileMetadata> {
  const normalized = normalizePath(path);
  const record = await idb.get(normalized);
  if (!record) throw new Error(`File not found: ${normalized}`);
  return {
    size: record.size,
    modified: record.modified,
  };
}
