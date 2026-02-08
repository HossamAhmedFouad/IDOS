"use client";

import { useEffect, useState, useCallback } from "react";
import { listDirectory } from "@/lib/file-system";
import { Folder, File, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const MAX_SELECTED_FILES = 5;

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface AttachmentFilePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (paths: string[]) => void;
  initialPath?: string;
  /** Already selected paths (e.g. when adding more from IntentInput). */
  existingPaths?: string[];
}

export function AttachmentFilePickerDialog({
  open,
  onOpenChange,
  onSelect,
  initialPath = "/",
  existingPaths = [],
}: AttachmentFilePickerDialogProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  const loadDir = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const names = await listDirectory(path);
      const pathPrefix =
        path === "/" ? "/" : path.endsWith("/") ? path : path + "/";
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
      setError(
        err instanceof Error ? err.message : "Failed to list directory"
      );
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentPath(initialPath);
      setSelectedPaths([]);
      setError(null);
    }
  }, [open, initialPath]);

  useEffect(() => {
    if (open) {
      loadDir(currentPath);
    }
  }, [open, currentPath, loadDir]);

  const handleEntryClick = useCallback(
    (entry: FileEntry) => {
      if (entry.isDir) {
        setCurrentPath(entry.path + (entry.path === "/" ? "" : "/"));
      } else {
        const path = entry.path;
        const combined = [...existingPaths, ...selectedPaths];
        if (combined.includes(path)) return;
        if (combined.length >= MAX_SELECTED_FILES) return;
        setSelectedPaths((prev) =>
          prev.includes(path) ? prev : [...prev, path]
        );
      }
    },
    [existingPaths, selectedPaths]
  );

  const removePath = useCallback((path: string) => {
    setSelectedPaths((prev) => prev.filter((p) => p !== path));
  }, []);

  const handleConfirm = useCallback(() => {
    const all = [
      ...new Set([...existingPaths, ...selectedPaths]),
    ].slice(0, MAX_SELECTED_FILES);
    onSelect(all);
    onOpenChange(false);
  }, [existingPaths, selectedPaths, onSelect, onOpenChange]);

  const pathParts =
    currentPath === "/" ? [] : currentPath.split("/").filter(Boolean);
  const breadcrumbs = ["/", ...pathParts];
  const totalCount = existingPaths.length + selectedPaths.length;
  const atLimit = totalCount >= MAX_SELECTED_FILES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach files</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Choose files from your IDOS storage. Up to {MAX_SELECTED_FILES} files.
          </p>
          <div className="rounded-md border border-border bg-muted/50 p-2">
            <div className="flex flex-wrap items-center gap-1 text-sm">
              {breadcrumbs.map((part, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setCurrentPath(
                      i === 0 ? "/" : "/" + breadcrumbs.slice(1, i + 1).join("/")
                    )
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
          <div className="max-h-48 overflow-auto rounded-md border border-border">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {currentPath !== "/" && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        const parent =
                          pathParts.length <= 1
                            ? "/"
                            : "/" + pathParts.slice(0, -1).join("/");
                        setCurrentPath(parent);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Folder className="size-4 shrink-0" />
                      <span>..</span>
                    </button>
                  </li>
                )}
                {entries.map((e) => {
                  const isSelected =
                    selectedPaths.includes(e.path) ||
                    existingPaths.includes(e.path);
                  const canAdd =
                    !e.isDir &&
                    !isSelected &&
                    existingPaths.length + selectedPaths.length < MAX_SELECTED_FILES;
                  return (
                    <li key={e.path}>
                      <button
                        type="button"
                        onClick={() => handleEntryClick(e)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent ${
                          isSelected && !e.isDir ? "bg-accent/50" : ""
                        } ${!e.isDir && !canAdd && !isSelected ? "opacity-60" : ""}`}
                        disabled={!e.isDir && !canAdd && !isSelected}
                      >
                        {e.isDir ? (
                          <Folder className="size-4 shrink-0 text-amber-500" />
                        ) : (
                          <File className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{e.name}</span>
                        {!e.isDir && canAdd && (
                          <Plus className="size-3.5 shrink-0 ml-auto text-muted-foreground" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {(existingPaths.length > 0 || selectedPaths.length > 0) && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Selected ({totalCount}/{MAX_SELECTED_FILES})
              </span>
              <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-muted/30 p-2">
                {existingPaths.map((path) => (
                  <span
                    key={path}
                    className="inline-flex items-center gap-1 rounded bg-background px-2 py-1 text-xs text-muted-foreground"
                  >
                    {path.split("/").pop() ?? path}
                  </span>
                ))}
                {selectedPaths.map((path) => (
                  <span
                    key={path}
                    className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-1 text-xs text-foreground"
                  >
                    {path.split("/").pop() ?? path}
                    <button
                      type="button"
                      onClick={() => removePath(path)}
                      className="rounded hover:bg-destructive/20 p-0.5"
                      aria-label="Remove"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              {atLimit && (
                <p className="text-xs text-muted-foreground">
                  Maximum {MAX_SELECTED_FILES} files. Remove one to add another.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={existingPaths.length === 0 && selectedPaths.length === 0}
          >
            Add files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
