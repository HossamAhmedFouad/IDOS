"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useAgentStore } from "@/store/use-agent-store";
import { useToolRegistry } from "@/store/use-tool-registry";
import { FilePickerDialog } from "@/components/file-picker";
import { Button } from "@/components/ui/button";
import { FolderOpen, FileDown, FileText, Eye, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/markdown-content";
import { createNotesTools } from "./tools";

const SIDEBAR_WIDTH = 240;
const MAX_RECENT = 20;

function isMdFile(path: string | undefined): boolean {
  return Boolean(path?.toLowerCase().endsWith(".md"));
}

function moveToFront(paths: string[], path: string): string[] {
  const rest = paths.filter((p) => p !== path);
  return [path, ...rest].slice(0, MAX_RECENT);
}

function addToRecent(paths: string[], path: string): string[] {
  return moveToFront(paths, path);
}

export function NotesApp({ id, config }: AppProps) {
  const filePath = config?.filePath as string | undefined;
  const recentFilePaths = (config?.recentFilePaths as string[] | undefined) ?? [];
  const registerTool = useToolRegistry((s) => s.registerTool);
  const unregisterTool = useToolRegistry((s) => s.unregisterTool);
  const notesTools = useMemo(() => createNotesTools(id), [id]);

  useEffect(() => {
    notesTools.forEach((tool) => registerTool(tool));
    return () => {
      notesTools.forEach((tool) => unregisterTool(tool.name));
    };
  }, [notesTools, registerTool, unregisterTool]);
  const draftContent = config?.draftContent as string | undefined;
  const updateAppConfig = useWorkspaceStore((s) => s.updateAppConfig);
  const [content, setContent] = useState(() =>
    filePath ? "" : (draftContent ?? "")
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [mdViewMode, setMdViewMode] = useState<"edit" | "preview">("preview");
  const contentRef = useRef(content);
  const isMd = isMdFile(filePath);
  contentRef.current = content;

  const loadContent = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const text = await readFile(path);
      setContent(text);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        setContent("");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (filePath) {
      loadContent(filePath);
    } else {
      setContent(draftContent ?? "");
      setLoading(false);
    }
  }, [filePath, loadContent, draftContent]);

  const view = useWorkspaceStore((s) => s.view);
  const agentDataVersion = useAgentStore((s) => s.agentDataVersion);
  const agentNoteContent = useAgentStore((s) => s.agentNoteContent);
  const setAgentNoteContent = useAgentStore((s) => s.setAgentNoteContent);

  useEffect(() => {
    if (view === "agent" && agentDataVersion > 0 && filePath) {
      loadContent(filePath);
    }
  }, [view, agentDataVersion, filePath, loadContent]);

  // Sync agent-written content so it appears in the Notes app (avoids React controlled-component overwriting typewriter DOM updates)
  useEffect(() => {
    if (agentNoteContent && filePath && agentNoteContent.path === filePath) {
      setContent(agentNoteContent.content);
      setAgentNoteContent(null);
    }
  }, [agentNoteContent, filePath, setAgentNoteContent]);

  useEffect(() => {
    return () => {
      const latest = contentRef.current;
      if (filePath) {
        writeFile(filePath, latest).catch(() => {});
      } else if (latest) {
        updateAppConfig(id, { draftContent: latest });
      }
    };
  }, [filePath, id, updateAppConfig]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const handleBlur = useCallback(async () => {
    if (!filePath || saving || loading) return;
    setSaving(true);
    setError(null);
    try {
      await writeFile(filePath, content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [filePath, content, saving, loading]);

  const handleLoadSelect = useCallback(
    async (selectedPath: string) => {
      setLoading(true);
      setError(null);
      try {
        const text = await readFile(selectedPath);
        setContent(text);
        updateAppConfig(id, {
          filePath: selectedPath,
          draftContent: undefined,
          recentFilePaths: addToRecent(recentFilePaths, selectedPath),
        });
        setLoadOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [id, updateAppConfig, recentFilePaths]
  );

  const handleSaveAsSelect = useCallback(
    async (selectedPath: string) => {
      setSaving(true);
      setError(null);
      try {
        await writeFile(selectedPath, content);
        updateAppConfig(id, {
          filePath: selectedPath,
          draftContent: undefined,
          recentFilePaths: addToRecent(recentFilePaths, selectedPath),
        });
        setSaveAsOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [content, id, updateAppConfig, recentFilePaths]
  );

  const isAgentPreview = config?.agentPreview === true;

  const handleOpenRecent = useCallback(
    (path: string) => {
      if (isAgentPreview) {
        useAgentStore.getState().setLastCreatedNotePath(path);
        useAgentStore.getState().addPathToAgentRecentNotePaths(path);
        loadContent(path);
      } else {
        updateAppConfig(id, {
          filePath: path,
          recentFilePaths: moveToFront(recentFilePaths, path),
        });
        loadContent(path);
      }
    },
    [id, isAgentPreview, updateAppConfig, recentFilePaths, loadContent]
  );

  if (loading && !content) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div id={id} className="flex h-full min-w-0">
      <div
        className="flex shrink-0 flex-col border-r border-border bg-muted/30"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-muted/50 px-2 py-2">
          <History className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Recent</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          {recentFilePaths.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No recent files</p>
          ) : (
            <ul className="space-y-0.5">
              {recentFilePaths.map((path) => {
                const name = path.split("/").pop() ?? path;
                const isActive = path === filePath;
                return (
                  <li key={path}>
                    <button
                      type="button"
                      onClick={() => handleOpenRecent(path)}
                      title={path}
                      className={cn(
                        "w-full truncate rounded px-2 py-1.5 text-left text-xs transition-colors",
                        isActive
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-2 flex shrink-0 items-center gap-2 border-b border-border pb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLoadOpen(true)}
            disabled={saving || loading}
          >
            <FolderOpen className="size-4 mr-1" />
            Load
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSaveAsOpen(true)}
            disabled={saving || loading}
          >
            <FileDown className="size-4 mr-1" />
            Save As
          </Button>
          {isMd && (
            <>
              <Button
                type="button"
                variant={mdViewMode === "edit" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setMdViewMode("edit")}
              >
                <FileText className="size-4 mr-1" />
                Edit
              </Button>
              <Button
                type="button"
                variant={mdViewMode === "preview" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setMdViewMode("preview")}
              >
                <Eye className="size-4 mr-1" />
                Preview
              </Button>
            </>
          )}
          <span className="ml-2 truncate text-xs text-muted-foreground" title={filePath ?? ""}>
            {filePath ?? "New note"}
          </span>
        </div>
        {error && (
          <div className="mb-2 rounded bg-destructive/10 px-2 py-1 text-sm text-destructive">
            {error}
          </div>
        )}
        {saving && (
          <div className="mb-2 text-xs text-muted-foreground">Saving...</div>
        )}
        <div data-note-content className="flex min-h-0 flex-1 flex-col overflow-auto">
          {isMd && mdViewMode === "preview" ? (
            <div className="p-3">
              <MarkdownContent content={content} />
            </div>
          ) : (
            <textarea
              className="h-full min-h-0 flex-1 resize-none rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Start typing..."
              value={content}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          )}
        </div>
      </div>
      <FilePickerDialog
        open={saveAsOpen}
        onOpenChange={setSaveAsOpen}
        mode="save"
        initialPath={filePath ?? "/notes"}
        onSelect={handleSaveAsSelect}
      />
      <FilePickerDialog
        open={loadOpen}
        onOpenChange={setLoadOpen}
        mode="open"
        initialPath={filePath ?? "/notes"}
        onSelect={handleLoadSelect}
      />
    </div>
  );
}
