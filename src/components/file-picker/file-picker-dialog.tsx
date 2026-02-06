"use client";

import { useEffect, useState, useCallback } from "react";
import { listDirectory, createDirectory } from "@/lib/file-system";
import { Folder, File, FolderPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ROOT = "/";

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface FilePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "save" | "open";
  initialPath?: string;
  onSelect: (path: string) => void;
}

function dirname(path: string): string {
  const p = path.replace(/\/$/, "");
  const last = p.lastIndexOf("/");
  if (last <= 0) return "/";
  return p.slice(0, last);
}

export function FilePickerDialog({
  open,
  onOpenChange,
  mode,
  initialPath = "/notes",
  onSelect,
}: FilePickerDialogProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

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
    if (open) {
      const dir = dirname(initialPath);
      setCurrentPath(dir || "/notes");
      setFileName(initialPath ? initialPath.split("/").pop() || "note.txt" : "note.txt");
      setSelectedPath(null);
      setShowNewFolderInput(false);
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
      await createDirectory(pathPrefix + name);
      setNewFolderName("");
      setShowNewFolderInput(false);
      loadDir(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
  }, [currentPath, newFolderName, loadDir]);

  const handleConfirm = useCallback(() => {
    if (mode === "save") {
      const name = fileName.trim();
      if (!name) {
        setError("Please enter a file name");
        return;
      }
      const pathPrefix = currentPath === "/" ? "/" : currentPath.endsWith("/") ? currentPath : currentPath + "/";
      const fullPath = pathPrefix + name;
      onSelect(fullPath);
    } else if (mode === "open" && selectedPath) {
      onSelect(selectedPath);
    }
    onOpenChange(false);
  }, [mode, fileName, currentPath, selectedPath, onSelect, onOpenChange]);

  const handleFileSelect = useCallback(
    (entry: FileEntry) => {
      if (entry.isDir) {
        setCurrentPath(entry.path + (entry.path === "/" ? "" : "/"));
      } else if (mode === "open") {
        setSelectedPath(entry.path);
      } else if (mode === "save") {
        setFileName(entry.name);
      }
    },
    [mode]
  );

  const pathParts = currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);
  const breadcrumbs = ["/", ...pathParts];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "save" ? "Save As" : "Open File"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="border border-border rounded-md bg-muted/50 p-2">
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
          {error && (
            <div className="rounded-md bg-destructive/10 px-2 py-1.5 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewFolderInput(true)}
              className="shrink-0"
            >
              <FolderPlus className="size-4 mr-1" />
              New folder
            </Button>
            {showNewFolderInput && (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") {
                      setShowNewFolderInput(false);
                      setNewFolderName("");
                    }
                  }}
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleCreateFolder}>
                  Create
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div className="max-h-48 overflow-auto rounded-md border border-border">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <ul className="divide-y divide-border">
                {entries.map((e) => (
                  <li key={e.path}>
                    <button
                      type="button"
                      onClick={() => handleFileSelect(e)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent ${
                        mode === "open" && !e.isDir && selectedPath === e.path
                          ? "bg-accent"
                          : ""
                      }`}
                    >
                      {e.isDir ? (
                        <Folder className="size-4 shrink-0 text-amber-500" />
                      ) : (
                        <File className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{e.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {mode === "save" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="file-picker-filename" className="text-sm font-medium">
                File name
              </label>
              <Input
                id="file-picker-filename"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="note.txt"
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={mode === "open" && !selectedPath}
          >
            {mode === "save" ? "Save" : "Open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
