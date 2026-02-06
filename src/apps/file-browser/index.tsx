"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";
import { listDirectory, readFile, writeFile, deleteFile } from "@/lib/file-system";
import { Folder, File, Trash2 } from "lucide-react";

const ROOT = "/";

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export function FileBrowserApp({ config }: AppProps) {
  const rootPath = (config?.rootPath as string | undefined) ?? ROOT;
  const [currentPath, setCurrentPath] = useState(rootPath);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState("");

  const loadDir = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const names = await listDirectory(path);
      const pathPrefix = path === "/" ? "/" : path.endsWith("/") ? path : path + "/";
      const items: FileEntry[] = names.map((name) => {
        const fullPath = pathPrefix + name;
        const isDir = !name.includes(".");
        return { name, path: fullPath, isDir };
      });
      items.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setEntries(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list directory");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDir(currentPath);
  }, [currentPath, loadDir]);

  const loadPreview = useCallback(async (path: string) => {
    setPreviewPath(path);
    try {
      const content = await readFile(path);
      setPreviewContent(content);
    } catch {
      setPreviewContent("(Cannot preview this file)");
    }
  }, []);

  const handleDelete = useCallback(
    async (path: string, isDir: boolean) => {
      if (isDir) return;
      if (!confirm(`Delete ${path}?`)) return;
      try {
        await deleteFile(path);
        if (previewPath === path) {
          setPreviewPath(null);
          setPreviewContent("");
        }
        loadDir(currentPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    },
    [currentPath, loadDir, previewPath]
  );

  const pathParts = currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);
  const breadcrumbs = ["/", ...pathParts];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {breadcrumbs.map((part, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                setCurrentPath(i === 0 ? "/" : "/" + breadcrumbs.slice(1, i + 1).join("/"))
              }
              className="rounded px-1.5 py-0.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {part}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <div className="shrink-0 bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <div className="flex w-1/2 flex-col overflow-auto border-r border-zinc-200 dark:border-zinc-700">
          {loading ? (
            <div className="p-4 text-sm text-zinc-500">Loading...</div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {entries.map((e) => (
                <li
                  key={e.path}
                  className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <button
                    type="button"
                    onClick={() =>
                      e.isDir ? setCurrentPath(e.path + (e.path === "/" ? "" : "/")) : loadPreview(e.path)
                    }
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                  >
                    {e.isDir ? (
                      <Folder className="size-4 shrink-0 text-amber-500" />
                    ) : (
                      <File className="size-4 shrink-0 text-zinc-500" />
                    )}
                    <span className="truncate">{e.name}</span>
                  </button>
                  {!e.isDir && (
                    <button
                      type="button"
                      onClick={() => handleDelete(e.path, e.isDir)}
                      className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex w-1/2 flex-col overflow-hidden">
          {previewPath ? (
            <>
              <div className="shrink-0 border-b border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {previewPath}
              </div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                {previewContent}
              </pre>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
              Select a file to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
