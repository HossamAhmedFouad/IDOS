"use client";

import { useState, useCallback, useEffect } from "react";
import { listDirectory, createDirectory, writeFile } from "@/lib/file-system";
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, FilePlus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";

function isDirectory(name: string): boolean {
  return !name.includes(".");
}

export interface FileTreeProps {
  rootPath: string;
  onOpenFile: (path: string) => void;
  selectedPath: string | null;
  /** When this value changes, the tree will re-fetch the root directory (e.g. after agent creates a file). */
  refreshTrigger?: number;
}

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
}

function TreeNode({
  entry,
  depth,
  expandedDirs,
  onToggleExpand,
  onOpenFile,
  selectedPath,
}: {
  entry: FileEntry;
  depth: number;
  expandedDirs: Set<string>;
  onToggleExpand: (path: string) => void;
  onOpenFile: (path: string) => void;
  selectedPath: string | null;
}) {
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const isExpanded = expandedDirs.has(entry.path);

  const loadChildren = useCallback(async () => {
    if (!entry.isDir || children !== null) return;
    setLoading(true);
    try {
      const names = await listDirectory(entry.path);
      const pathPrefix = entry.path === "/" ? "/" : entry.path.endsWith("/") ? entry.path : entry.path + "/";
      const items: FileEntry[] = names.map((name) => {
        const fullPath = pathPrefix + name;
        return { name, path: fullPath, isDir: isDirectory(name) };
      });
      items.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setChildren(items);
    } finally {
      setLoading(false);
    }
  }, [entry.path, entry.isDir, children]);

  useEffect(() => {
    if (entry.isDir && isExpanded) {
      loadChildren();
    }
  }, [entry.isDir, isExpanded, loadChildren]);

  const handleClick = useCallback(() => {
    if (entry.isDir) {
      onToggleExpand(entry.path);
    } else {
      onOpenFile(entry.path);
    }
  }, [entry.isDir, entry.path, onToggleExpand, onOpenFile]);

  const isSelected = selectedPath === entry.path;

  if (entry.isDir) {
    return (
      <div className="select-none">
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex w-full items-center gap-1 py-1 pr-2 text-left text-sm hover:bg-accent",
            isSelected && "bg-accent"
          )}
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          {loading ? (
            <span className="size-4 shrink-0" />
          ) : (
            isExpanded ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )
          )}
          {isExpanded ? (
            <FolderOpen className="size-4 shrink-0 text-amber-500" />
          ) : (
            <Folder className="size-4 shrink-0 text-amber-500" />
          )}
          <span className="truncate text-foreground">{entry.name}</span>
        </button>
        {isExpanded && children && (
          <div>
            {children.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                expandedDirs={expandedDirs}
                onToggleExpand={onToggleExpand}
                onOpenFile={onOpenFile}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-1 py-1 pr-2 text-left text-sm hover:bg-accent",
        isSelected && "bg-accent"
      )}
      style={{ paddingLeft: depth * 12 + 8 }}
    >
      <span className="size-4 shrink-0" />
      <File className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate text-foreground">{entry.name}</span>
    </button>
  );
}

export function FileTree({ rootPath, onOpenFile, selectedPath, refreshTrigger }: FileTreeProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set([rootPath]));
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  const loadRoot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const names = await listDirectory(rootPath);
      const pathPrefix = rootPath === "/" ? "/" : rootPath.endsWith("/") ? rootPath : rootPath + "/";
      const items: FileEntry[] = names.map((name) => {
        const fullPath = pathPrefix + name;
        return { name, path: fullPath, isDir: isDirectory(name) };
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
  }, [rootPath]);

  useEffect(() => {
    loadRoot();
  }, [loadRoot, refreshTrigger]);

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleCreateFile = useCallback(async () => {
    const name = newFileName.trim();
    if (!name) {
      setShowNewFileInput(false);
      setNewFileName("");
      return;
    }
    const pathPrefix = rootPath === "/" ? "/" : rootPath.endsWith("/") ? rootPath : rootPath + "/";
    const newPath = pathPrefix + name;
    setError(null);
    try {
      await writeFile(newPath, "");
      setNewFileName("");
      setShowNewFileInput(false);
      loadRoot();
      onOpenFile(newPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create file");
    }
  }, [rootPath, newFileName, loadRoot, onOpenFile]);

  const handleCreateFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) {
      setShowNewFolderInput(false);
      setNewFolderName("");
      return;
    }
    const pathPrefix = rootPath === "/" ? "/" : rootPath.endsWith("/") ? rootPath : rootPath + "/";
    const newPath = pathPrefix + name;
    setError(null);
    try {
      await createDirectory(newPath);
      setNewFolderName("");
      setShowNewFolderInput(false);
      setExpandedDirs((prev) => new Set(prev).add(rootPath));
      loadRoot();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    }
  }, [rootPath, newFolderName, loadRoot]);

  const displayName = rootPath === "/" ? "root" : rootPath.split("/").filter(Boolean).pop() ?? "root";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-muted/50 px-2 py-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-xs font-medium text-muted-foreground">{displayName}</span>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => {
                setShowNewFileInput(true);
                setNewFileName("");
                setShowNewFolderInput(false);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="New file"
            >
              <FilePlus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewFolderInput(true);
                setNewFolderName("");
                setShowNewFileInput(false);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="New folder"
            >
              <FolderPlus className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
      {showNewFileInput && (
        <div className="shrink-0 flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFile();
              if (e.key === "Escape") {
                setShowNewFileInput(false);
                setNewFileName("");
              }
            }}
            placeholder="File name"
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <button
            type="button"
            onClick={handleCreateFile}
            className="shrink-0 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
          >
            Create
          </button>
        </div>
      )}
      {showNewFolderInput && (
        <div className="shrink-0 flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") {
                setShowNewFolderInput(false);
                setNewFolderName("");
              }
            }}
            placeholder="Folder name"
            className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <button
            type="button"
            onClick={handleCreateFolder}
            className="shrink-0 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
          >
            Create
          </button>
        </div>
      )}
      {error && (
        <div className="shrink-0 px-2 py-1 text-xs text-destructive">{error}</div>
      )}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 text-xs text-muted-foreground">Loading...</div>
        ) : (
          <div className="py-1">
            {entries.map((entry) => (
              <TreeNode
                key={entry.path}
                entry={entry}
                depth={0}
                expandedDirs={expandedDirs}
                onToggleExpand={handleToggleExpand}
                onOpenFile={onOpenFile}
                selectedPath={selectedPath}
              />
            ))}
            {entries.length === 0 && (
              <div className="px-4 py-2 text-xs text-muted-foreground">
                Empty folder. Create a file or folder above.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
