"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { AppProps } from "@/lib/types";
import {
  readFile,
  writeFile,
  listDirectory,
  createDirectory,
} from "@/lib/file-system";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useToolRegistry } from "@/store/use-tool-registry";
import { useAgentStore } from "@/store/use-agent-store";
import { FileTree } from "./file-tree";
import { X, FolderOpen, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderPickerDialog } from "@/components/file-picker";
import { createCodeEditorTools } from "./tools";
import { Button } from "@/components/ui/button";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { registerCodeEditorBridge, unregisterCodeEditorBridge } from "@/lib/code-editor-bridge";
import { AGENT_PLACEHOLDER_ID } from "@/lib/constants/agent-placeholder";
import {
  lineHighlightField,
  setLineHighlight as setLineHighlightCmd,
  clearLineHighlight,
} from "./line-highlight-extension";

const DEFAULT_DIRECTORY = "/code";
const SIDEBAR_WIDTH = 280;

function languageFromPath(path: string) {
  const ext = path.replace(/^.*\./, "").toLowerCase();
  if (ext === "js" || ext === "jsx" || ext === "ts" || ext === "tsx" || ext === "mjs" || ext === "cjs") return javascript;
  if (ext === "java") return java;
  if (ext === "py" || ext === "pyw") return python;
  return javascript;
}

function dirname(path: string): string {
  const p = path.replace(/\/$/, "");
  const last = p.lastIndexOf("/");
  if (last <= 0) return "/";
  return p.slice(0, last);
}

export function CodeEditorApp({ id, config }: AppProps) {
  const updateAppConfig = useWorkspaceStore((s) => s.updateAppConfig);
  const registerTool = useToolRegistry((s) => s.registerTool);
  const codeEditorTools = useMemo(() => createCodeEditorTools(id), [id]);

  useEffect(() => {
    codeEditorTools.forEach((tool) => registerTool(tool));
    // Do not unregister on unmount: agent may still have in-flight tool calls for this app.
  }, [codeEditorTools, registerTool]);
  const configDirectory = config?.directoryPath as string | undefined;
  const configFilePath = config?.filePath as string | undefined;
  const directoryPath = configDirectory ?? dirname(configFilePath ?? DEFAULT_DIRECTORY + "/main.js") ?? DEFAULT_DIRECTORY;

  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [contentByPath, setContentByPath] = useState<Record<string, string>>({});
  const [loadedContentByPath, setLoadedContentByPath] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [initDone, setInitDone] = useState(false);
  const [openFolderOpen, setOpenFolderOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const editorViewRef = useRef<import("@codemirror/view").EditorView | null>(null);
  const lineHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureDirectoryExists = useCallback(async () => {
    try {
      await listDirectory(directoryPath);
    } catch {
      try {
        await createDirectory(directoryPath);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create directory");
      }
    }
  }, [directoryPath]);

  const loadFileContent = useCallback(async (path: string) => {
    setError(null);
    try {
      const text = await readFile(path);
      setLoadedContentByPath((prev) => ({ ...prev, [path]: text }));
      setContentByPath((prev) => ({ ...prev, [path]: prev[path] ?? text }));
      return text;
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        setLoadedContentByPath((prev) => ({ ...prev, [path]: "" }));
        setContentByPath((prev) => ({ ...prev, [path]: prev[path] ?? "" }));
        return "";
      }
      setError(err instanceof Error ? err.message : "Failed to load");
      return null;
    }
  }, []);

  useEffect(() => {
    ensureDirectoryExists().then(() => setInitDone(true));
  }, [ensureDirectoryExists]);

  useEffect(() => {
    if (initDone && configFilePath && loadFileContent) {
      const dir = dirname(configFilePath);
      if (dir === directoryPath && !openFiles.includes(configFilePath)) {
        setOpenFiles((prev) => [...prev, configFilePath]);
        setActiveFile(configFilePath);
        loadFileContent(configFilePath);
      }
    }
  }, [initDone, configFilePath, directoryPath, openFiles, loadFileContent]);

  const handleOpenFile = useCallback((path: string) => {
    setActiveFile(path);
    if (!contentByPath[path] && !loadedContentByPath[path]) {
      loadFileContent(path);
    }
    setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, [contentByPath, loadedContentByPath, loadFileContent]);

  const handleCloseTab = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFiles((prev) => {
      const next = prev.filter((p) => p !== path);
      setActiveFile((current) => {
        if (current === path) return next[next.length - 1] ?? null;
        return current;
      });
      return next;
    });
  }, []);

  const saveFile = useCallback(async (path: string, content: string) => {
    const loaded = loadedContentByPath[path];
    if (loaded !== undefined && content === loaded) return;
    setSaveStatus("saving");
    setError(null);
    try {
      await writeFile(path, content);
      setLoadedContentByPath((prev) => ({ ...prev, [path]: content }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }, [loadedContentByPath]);

  const handleContentChange = useCallback((path: string, value: string) => {
    setContentByPath((prev) => ({ ...prev, [path]: value }));
  }, []);

  const handleBlur = useCallback(async () => {
    if (activeFile) {
      const content = contentByPath[activeFile];
      if (content !== undefined) {
        await saveFile(activeFile, content);
      }
    }
  }, [activeFile, contentByPath, saveFile]);

  const currentContent = activeFile ? (contentByPath[activeFile] ?? loadedContentByPath[activeFile] ?? "") : "";
  const isUnsaved = activeFile && contentByPath[activeFile] !== undefined && contentByPath[activeFile] !== loadedContentByPath[activeFile];

  const switchToFolder = useCallback(
    (path: string) => {
      setError(null);
      updateAppConfig(id, { directoryPath: path, filePath: undefined });
      setOpenFiles([]);
      setActiveFile(null);
      setContentByPath({});
      setLoadedContentByPath({});
    },
    [id, updateAppConfig]
  );

  const handleOpenFolderSelect = useCallback(
    (path: string) => {
      switchToFolder(path);
      setOpenFolderOpen(false);
    },
    [switchToFolder]
  );

  const handleNewFolderSelect = useCallback(
    (path: string) => {
      switchToFolder(path);
      setNewFolderOpen(false);
    },
    [switchToFolder]
  );

  const openOpenFolderDialog = useCallback(() => setOpenFolderOpen(true), []);
  const openNewFolderDialog = useCallback(() => setNewFolderOpen(true), []);

  const codeEditorExtensions = useMemo(
    () => [lineHighlightField(), activeFile ? languageFromPath(activeFile)() : javascript()],
    [activeFile]
  );

  useEffect(() => {
    return () => {
      unregisterCodeEditorBridge(id);
      if (id.startsWith("agent-preview-")) {
        unregisterCodeEditorBridge(AGENT_PLACEHOLDER_ID);
      }
      if (lineHighlightTimeoutRef.current) clearTimeout(lineHighlightTimeoutRef.current);
    };
  }, [id]);

  const handleCreateEditor = useCallback(
    (view: import("@codemirror/view").EditorView) => {
      editorViewRef.current = view;
      const bridge = {
        setContent(content: string) {
          const v = editorViewRef.current;
          if (!v) return;
          const len = v.state.doc.length;
          v.dispatch({ changes: { from: 0, to: len, insert: content } });
        },
        setLineHighlight(lineNumbersArr: number[], color: string, durationMs: number) {
          const v = editorViewRef.current;
          if (!v) return;
          if (lineHighlightTimeoutRef.current) {
            clearTimeout(lineHighlightTimeoutRef.current);
            lineHighlightTimeoutRef.current = null;
          }
          setLineHighlightCmd(v, lineNumbersArr, color);
          lineHighlightTimeoutRef.current = setTimeout(() => {
            clearLineHighlight(v);
            lineHighlightTimeoutRef.current = null;
          }, durationMs);
        },
      };
      registerCodeEditorBridge(id, bridge);
      if (id.startsWith("agent-preview-")) {
        registerCodeEditorBridge(AGENT_PLACEHOLDER_ID, bridge);
      }
    },
    [id]
  );

  if (!initDone) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div id={id} className="flex h-full font-mono text-sm">
      <div
        className="shrink-0 flex flex-col border-r border-border bg-muted/30"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="shrink-0 flex items-center gap-1 border-b border-border bg-muted/50 px-2 py-1.5">
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={directoryPath}>
            {directoryPath || "/"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={openOpenFolderDialog}
            title="Open folder"
          >
            <FolderOpen className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={openNewFolderDialog}
            title="New folder"
          >
            <FolderPlus className="size-3.5" />
          </Button>
        </div>
        <FileTree
          rootPath={directoryPath}
          onOpenFile={handleOpenFile}
          selectedPath={activeFile}
        />
      </div>
      <FolderPickerDialog
        open={openFolderOpen}
        onOpenChange={setOpenFolderOpen}
        mode="open"
        initialPath={directoryPath}
        onSelect={handleOpenFolderSelect}
      />
      <FolderPickerDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        mode="create"
        initialPath={directoryPath}
        onSelect={handleNewFolderSelect}
      />
      <div className="flex flex-1 flex-col min-w-0">
        {error && (
          <div className="shrink-0 rounded-b-none rounded-t border-b border-border bg-destructive/10 px-3 py-1.5 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/50 overflow-x-auto">
          {openFiles.map((path) => {
            const name = path.split("/").pop() ?? "untitled";
            const isActive = path === activeFile;
            return (
              <div
                key={path}
                role="tab"
                tabIndex={0}
                onClick={() => setActiveFile(path)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveFile(path);
                  }
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-r border-border px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                  isActive ? "bg-background text-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
                title={path}
              >
                <span className="truncate max-w-[120px]">{name}</span>
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(path, e)}
                  className="rounded p-0.5 hover:bg-accent hover:text-foreground"
                  aria-label="Close tab"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
          {openFiles.length === 0 && (
            <div className="px-4 py-2 text-xs text-muted-foreground">
              Select a file from the explorer
            </div>
          )}
          {openFiles.length > 0 && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5">
              {saveStatus === "saving" && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-green-600 dark:text-green-400">Saved</span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs text-destructive">Save failed</span>
              )}
              {isUnsaved && saveStatus === "idle" && (
                <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved</span>
              )}
            </div>
          )}
        </div>
        <div data-code-editor className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeFile ? (
            <div className="flex-1 min-h-0 overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto">
              <CodeMirror
                value={currentContent}
                height="100%"
                className="h-full border-0 rounded-none code-editor-codemirror"
                theme="dark"
                extensions={codeEditorExtensions}
                onChange={(value) => handleContentChange(activeFile, value)}
                onBlur={handleBlur}
                onCreateEditor={handleCreateEditor}
                basicSetup={true}
                data-code-content
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a file from the explorer
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
