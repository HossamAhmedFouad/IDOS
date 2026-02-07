"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useAgentStore } from "@/store/use-agent-store";
import { useToolRegistry } from "@/store/use-tool-registry";
import { FilePickerDialog } from "@/components/file-picker";
import { Button } from "@/components/ui/button";
import { FolderOpen, FileDown, FileText, Eye } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import { createNotesTools } from "./tools";

function isMdFile(path: string | undefined): boolean {
  return Boolean(path?.toLowerCase().endsWith(".md"));
}

export function NotesApp({ id, config }: AppProps) {
  const filePath = config?.filePath as string | undefined;
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
  useEffect(() => {
    if (view === "agent" && agentDataVersion > 0 && filePath) {
      loadContent(filePath);
    }
  }, [view, agentDataVersion, filePath, loadContent]);

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
        updateAppConfig(id, { filePath: selectedPath, draftContent: undefined });
        setLoadOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [id, updateAppConfig]
  );

  const handleSaveAsSelect = useCallback(
    async (selectedPath: string) => {
      setSaving(true);
      setError(null);
      try {
        await writeFile(selectedPath, content);
        updateAppConfig(id, { filePath: selectedPath, draftContent: undefined });
        setSaveAsOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [content, id, updateAppConfig]
  );

  if (loading && !content) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div id={id} className="flex h-full flex-col p-4">
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
