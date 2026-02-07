"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { AppProps } from "@/lib/types";
import {
  listDirectory,
  readFile,
  writeFile,
  deleteFile,
  deleteDirectory,
  createDirectory,
} from "@/lib/file-system";
import { useToolRegistry } from "@/store/use-tool-registry";
import { Folder, File, Trash2, FolderPlus, FilePlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fileBrowserTools } from "./tools";

const ROOT = "/";
const AUTO_SAVE_DELAY_MS = 600;

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export function FileBrowserApp({ config }: AppProps) {
  const rootPath = (config?.rootPath as string | undefined) ?? ROOT;
  const registerTool = useToolRegistry((s) => s.registerTool);
  const unregisterTool = useToolRegistry((s) => s.unregisterTool);

  useEffect(() => {
    fileBrowserTools.forEach((tool) => registerTool(tool));
    return () => fileBrowserTools.forEach((tool) => unregisterTool(tool.name));
  }, [registerTool, unregisterTool]);

  const [currentPath, setCurrentPath] = useState(rootPath);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewDirInput, setShowNewDirInput] = useState(false);
  const [newDirName, setNewDirName] = useState("");
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [previewLoadOk, setPreviewLoadOk] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef("");

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
    setSaveStatus("idle");
    setPreviewLoadOk(false);
    try {
      const content = await readFile(path);
      setPreviewContent(content);
      lastSavedContentRef.current = content;
      setPreviewLoadOk(true);
    } catch {
      setPreviewContent("(Cannot preview this file)");
    }
  }, []);

  const saveContent = useCallback(
    async (path: string, content: string) => {
      if (content === lastSavedContentRef.current) return;
      setSaveStatus("saving");
      try {
        await writeFile(path, content);
        lastSavedContentRef.current = content;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        setSaveStatus("error");
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    },
    []
  );

  const scheduleAutoSave = useCallback(
    (path: string, content: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(path, content);
        saveTimeoutRef.current = null;
      }, AUTO_SAVE_DELAY_MS);
    },
    [saveContent]
  );

  const handlePreviewChange = useCallback(
    (value: string) => {
      setPreviewContent(value);
      if (previewPath && previewLoadOk) scheduleAutoSave(previewPath, value);
    },
    [previewPath, previewLoadOk, scheduleAutoSave]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleCreateDirectory = useCallback(async () => {
    const name = newDirName.trim();
    if (!name) {
      setShowNewDirInput(false);
      setNewDirName("");
      return;
    }
    const pathPrefix = currentPath === "/" ? "/" : currentPath.endsWith("/") ? currentPath : currentPath + "/";
    const newPath = pathPrefix + name;
    setError(null);
    try {
      await createDirectory(newPath);
      setNewDirName("");
      setShowNewDirInput(false);
      loadDir(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create directory");
    }
  }, [currentPath, newDirName, loadDir]);

  const handleCreateFile = useCallback(async () => {
    const name = newFileName.trim();
    if (!name) {
      setShowNewFileInput(false);
      setNewFileName("");
      return;
    }
    const pathPrefix = currentPath === "/" ? "/" : currentPath.endsWith("/") ? currentPath : currentPath + "/";
    const newPath = pathPrefix + name;
    setError(null);
    try {
      await writeFile(newPath, "");
      setNewFileName("");
      setShowNewFileInput(false);
      loadDir(currentPath);
      setPreviewPath(newPath);
      setPreviewContent("");
      lastSavedContentRef.current = "";
      setPreviewLoadOk(true);
      setSaveStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    }
  }, [currentPath, newFileName, loadDir]);

  const handleDelete = useCallback(
    async (path: string, isDir: boolean) => {
      const message = isDir
        ? `Delete folder "${path}" and all its contents?`
        : `Delete ${path}?`;
      if (!confirm(message)) return;
      try {
        if (isDir) {
          await deleteDirectory(path);
          if (previewPath && (previewPath === path || previewPath.startsWith(path + "/"))) {
            setPreviewPath(null);
            setPreviewContent("");
          }
          if (currentPath === path || currentPath.startsWith(path + "/")) {
            const parts = path.split("/").filter(Boolean);
            const parent = parts.length <= 1 ? "/" : "/" + parts.slice(0, -1).join("/");
            setCurrentPath(parent);
            loadDir(parent);
          } else {
            loadDir(currentPath);
          }
        } else {
          await deleteFile(path);
          if (previewPath === path) {
            setPreviewPath(null);
            setPreviewContent("");
          }
          loadDir(currentPath);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    },
    [currentPath, loadDir, previewPath]
  );

  const pathParts = currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);
  const breadcrumbs = ["/", ...pathParts];
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredEntries = searchLower
    ? entries.filter((e) => e.name.toLowerCase().includes(searchLower))
    : entries;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-muted px-3 py-2">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {breadcrumbs.map((part, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                setCurrentPath(i === 0 ? "/" : "/" + breadcrumbs.slice(1, i + 1).join("/"))
              }
              className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {part}
            </button>
          ))}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => {
            setShowNewDirInput(true);
            setNewDirName("");
            setShowNewFileInput(false);
          }}
        >
          <FolderPlus className="size-4" />
          New folder
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => {
            setShowNewFileInput(true);
            setNewFileName("");
            setShowNewDirInput(false);
          }}
        >
          <FilePlus className="size-4" />
          New file
        </Button>
      </div>
      {showNewDirInput && (
        <div className="shrink-0 flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <Input
            placeholder="Folder name"
            value={newDirName}
            onChange={(e) => setNewDirName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateDirectory();
              if (e.key === "Escape") {
                setShowNewDirInput(false);
                setNewDirName("");
              }
            }}
            className="h-8 text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleCreateDirectory}>
            Create
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowNewDirInput(false);
              setNewDirName("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      {showNewFileInput && (
        <div className="shrink-0 flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <Input
            placeholder="File name"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFile();
              if (e.key === "Escape") {
                setShowNewFileInput(false);
                setNewFileName("");
              }
            }}
            className="h-8 text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleCreateFile}>
            Create
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowNewFileInput(false);
              setNewFileName("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      {error && (
        <div className="shrink-0 bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <div className="flex w-1/2 flex-col overflow-auto border-r border-border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredEntries.map((e) => (
                <li
                  key={e.path}
                  className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted"
                >
                  <button
                    type="button"
                    onClick={() =>
                      e.isDir ? setCurrentPath(e.path + (e.path === "/" ? "" : "/")) : loadPreview(e.path)
                    }
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-foreground"
                  >
                    {e.isDir ? (
                      <Folder className="size-4 shrink-0 text-amber-500" />
                    ) : (
                      <File className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{e.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(e.path, e.isDir)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={e.isDir ? "Delete folder" : "Delete file"}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && searchQuery.trim() && filteredEntries.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No matches for &quot;{searchQuery}&quot;</div>
          )}
        </div>
        <div className="flex w-1/2 flex-col overflow-hidden">
          {previewPath ? (
            <>
              <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
                <span className="truncate text-xs text-muted-foreground">{previewPath}</span>
                {saveStatus === "saving" && (
                  <span className="shrink-0 text-xs text-muted-foreground">Saving...</span>
                )}
                {saveStatus === "saved" && (
                  <span className="shrink-0 text-xs text-green-600 dark:text-green-400">Saved</span>
                )}
                {saveStatus === "error" && (
                  <span className="shrink-0 text-xs text-destructive">Save failed</span>
                )}
              </div>
              <textarea
                className="flex-1 min-h-0 w-full resize-none overflow-auto border-0 bg-transparent p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-0 disabled:opacity-70"
                value={previewContent}
                onChange={(e) => handlePreviewChange(e.target.value)}
                disabled={!previewLoadOk}
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a file to view and edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
