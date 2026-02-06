"use client";

import { useEffect, useState, useCallback } from "react";
import { listDirectory, createDirectory } from "@/lib/file-system";
import { Folder, FolderOpen, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface FolderPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "open" | "create";
  initialPath?: string;
  onSelect: (path: string) => void;
}

function isDirectory(name: string): boolean {
  return !name.includes(".");
}

export function FolderPickerDialog({
  open,
  onOpenChange,
  mode,
  initialPath = "/",
  onSelect,
}: FolderPickerDialogProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  const loadDir = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const names = await listDirectory(path);
      const pathPrefix = path === "/" ? "/" : path.endsWith("/") ? path : path + "/";
      const items: FileEntry[] = names
        .map((name) => {
          const fullPath = pathPrefix + name;
          return { name, path: fullPath, isDir: isDirectory(name) };
        })
        .filter((e) => e.isDir);
      items.sort((a, b) => a.name.localeCompare(b.name));
      setEntries(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list directory");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      const path = initialPath.replace(/\/$/, "") || "/";
      const dir = path === "/" ? "/" : path;
      setCurrentPath(dir);
      setNewFolderName("");
    }
  }, [open, initialPath]);

  useEffect(() => {
    if (open) {
      loadDir(currentPath);
    }
  }, [open, currentPath, loadDir]);

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (/[/\\]/.test(name)) {
      setError("Folder name cannot contain / or \\");
      return;
    }
    setError(null);
    try {
      const pathPrefix = currentPath === "/" ? "/" : currentPath.endsWith("/") ? currentPath : currentPath + "/";
      const newPath = pathPrefix + name;
      await createDirectory(newPath);
      onSelect(newPath);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
  }, [currentPath, newFolderName, onSelect, onOpenChange]);

  const handleOpenCurrent = useCallback(() => {
    onSelect(currentPath);
    onOpenChange(false);
  }, [currentPath, onSelect, onOpenChange]);

  const handleEntryClick = useCallback((entry: FileEntry) => {
    if (entry.isDir) {
      const nextPath = entry.path === "/" ? "/" : entry.path;
      setCurrentPath(nextPath);
    }
  }, []);

  const pathParts = currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);
  const breadcrumbs = ["/", ...pathParts];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "open" ? "Open folder" : "New folder"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border bg-muted/50 p-2">
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
                  {part === "" ? "/" : part}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 px-2 py-1.5 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="max-h-56 overflow-auto rounded-md border border-border">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <ul className="divide-y divide-border">
                {currentPath !== "/" && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        const parts = pathParts.slice(0, -1);
                        setCurrentPath(parts.length === 0 ? "/" : "/" + parts.join("/"));
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Folder className="size-4 shrink-0" />
                      <span>..</span>
                    </button>
                  </li>
                )}
                {entries.map((e) => (
                  <li key={e.path}>
                    <button
                      type="button"
                      onClick={() => handleEntryClick(e)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
                    >
                      <FolderOpen className="size-4 shrink-0 text-amber-500" />
                      <span className="truncate">{e.name}</span>
                      <ChevronRight className="size-3 shrink-0 ml-auto text-muted-foreground" />
                    </button>
                  </li>
                ))}
                {!loading && entries.length === 0 && currentPath === "/" && (
                  <li className="px-3 py-4 text-sm text-muted-foreground">
                    No folders yet. Create one below.
                  </li>
                )}
              </ul>
            )}
          </div>
          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="new-folder-name" className="text-sm font-medium">
                New folder name
              </label>
              <div className="flex gap-2">
                <Input
                  id="new-folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="my-project"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                  }}
                />
                <Button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                >
                  Create
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Will create in: {currentPath === "/" ? "/" : currentPath}/
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === "open" ? (
            <Button type="button" onClick={handleOpenCurrent}>
              Open folder
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
