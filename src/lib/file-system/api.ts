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

export async function listDirectory(path: string): Promise<string[]> {
  const normalized = normalizePath(path);
  const dirPrefix = normalized.endsWith("/") ? normalized : normalized + "/";
  const allKeys = await idb.keys(dirPrefix);

  const seen = new Set<string>();
  for (const fullPath of allKeys) {
    const relative = fullPath.slice(dirPrefix.length);
    const firstSegment = relative.split("/")[0];
    if (firstSegment) seen.add(firstSegment);
  }
  return Array.from(seen).sort();
}

export async function deleteFile(path: string): Promise<void> {
  const normalized = normalizePath(path);
  await idb.remove(normalized);
}

export async function moveFile(oldPath: string, newPath: string): Promise<void> {
  const oldNorm = normalizePath(oldPath);
  const newNorm = normalizePath(newPath);
  const record = await idb.get(oldNorm);
  if (!record) throw new Error(`File not found: ${oldNorm}`);
  await idb.set(newNorm, record.content);
  await idb.remove(oldNorm);
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
