"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { AppProps } from "@/lib/types";
import {
  readFile,
  writeFile,
  listDirectory,
  createDirectory,
  deleteFile,
} from "@/lib/file-system";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useToolRegistry } from "@/store/use-tool-registry";
import { useAgentStore } from "@/store/use-agent-store";
import { FileTree } from "./file-tree";
import { X, FolderOpen, FolderPlus, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderPickerDialog } from "@/components/file-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCodeEditorTools } from "./tools";
import { Button } from "@/components/ui/button";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
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

function isHtmlFile(path: string): boolean {
  const ext = path.replace(/^.*\./, "").toLowerCase();
  return ext === "html" || ext === "htm";
}

function languageFromPath(path: string) {
  const ext = path.replace(/^.*\./, "").toLowerCase();
  if (ext === "html" || ext === "htm") return html;
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

/** Resolve a path relative to the document directory (baseDir). All refs are relative to the HTML file. */
function resolvePath(baseDir: string, raw: string): string {
  let p = raw.replace(/\\/g, "/").trim();
  if (!p) return baseDir;
  // Treat leading slash as relative to doc dir (e.g. /x.css from /a/b/c -> /a/b/c/x.css)
  if (p.startsWith("/")) p = p.slice(1);
  const base = baseDir.endsWith("/") ? baseDir : baseDir + "/";
  p = base + p;
  const parts = p.split("/").filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return "/" + out.join("/");
}

const PREVIEW_TEMP_DIR = "/.idos-preview";

/** Script with src: match full tag including closing so we replace entirely. */
const SCRIPT_SRC_REGEX = /<script\s[^>]*\ssrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
/** Link stylesheet: rel then href. */
const LINK_REL_FIRST = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi;
/** Link stylesheet: href then rel. */
const LINK_HREF_FIRST = /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi;

interface ResourceMatch {
  index: number;
  length: number;
  path: string;
  type: "script" | "style";
  fullTag: string;
}

function* findResourceMatches(html: string): Generator<ResourceMatch> {
  SCRIPT_SRC_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SCRIPT_SRC_REGEX.exec(html)) !== null) {
    const path = m[1];
    yield { index: m.index, length: m[0].length, path, type: "script", fullTag: m[0] };
  }
  LINK_REL_FIRST.lastIndex = 0;
  while ((m = LINK_REL_FIRST.exec(html)) !== null) {
    yield { index: m.index, length: m[0].length, path: m[1], type: "style", fullTag: m[0] };
  }
  LINK_HREF_FIRST.lastIndex = 0;
  while ((m = LINK_HREF_FIRST.exec(html)) !== null) {
    yield { index: m.index, length: m[0].length, path: m[1], type: "style", fullTag: m[0] };
  }
}

function dedupeOverlappingMatches(matches: ResourceMatch[]): ResourceMatch[] {
  const sorted = [...matches].sort((a, b) => a.index - b.index);
  const out: ResourceMatch[] = [];
  for (const m of sorted) {
    const overlaps = out.some(
      (prev) => m.index < prev.index + prev.length
    );
    if (!overlaps) out.push(m);
  }
  return out;
}

async function buildHtmlPreviewWithLinkedAssets(
  htmlContent: string,
  htmlDir: string,
  readFileFn: (path: string) => Promise<string>
): Promise<string> {
  const matches = dedupeOverlappingMatches(
    Array.from(findResourceMatches(htmlContent)).sort((a, b) => a.index - b.index)
  );
  const replacements: { index: number; length: number; newContent: string }[] = [];
  for (const match of matches) {
    const resolvedPath = resolvePath(htmlDir, match.path);
    let content: string;
    try {
      content = await readFileFn(resolvedPath);
    } catch {
      if (match.type === "script") {
        content = `console.error("Failed to load: ${resolvedPath}");`;
      } else {
        content = `/* Failed to load: ${resolvedPath} */`;
      }
    }
    const newContent =
      match.type === "script"
        ? `<script>${content.replace(/<\/script>/gi, "<\\/script>")}</script>`
        : `<style>${content}</style>`;
    replacements.push({ index: match.index, length: match.length, newContent });
  }
  if (replacements.length === 0) return htmlContent;
  let result = "";
  let lastEnd = 0;
  for (const r of replacements) {
    result += htmlContent.slice(lastEnd, r.index);
    result += r.newContent;
    lastEnd = r.index + r.length;
  }
  result += htmlContent.slice(lastEnd);
  return result;
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
  const activeFileRef = useRef<string | null>(null);
  activeFileRef.current = activeFile;
  const [htmlPreviewOpen, setHtmlPreviewOpen] = useState(false);
  const [htmlPreviewContent, setHtmlPreviewContent] = useState("");
  const [htmlPreviewTempPath, setHtmlPreviewTempPath] = useState<string | null>(null);
  const [fileTreeRefreshTrigger, setFileTreeRefreshTrigger] = useState(0);

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
      if (id.startsWith("agent-preview-")) {
        useAgentStore.getState().setAgentCodeEditorDirectoryPath(path);
        useAgentStore.getState().setLastCodeEditorFilePath(null);
      } else {
        updateAppConfig(id, { directoryPath: path, filePath: undefined });
      }
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

  const handleHtmlPreviewClose = useCallback(() => {
    setHtmlPreviewTempPath((tempPath) => {
      if (tempPath) deleteFile(tempPath).catch(() => {});
      return null;
    });
    setHtmlPreviewOpen(false);
  }, []);

  const handleHtmlRun = useCallback(async () => {
    if (!activeFile) return;
    const htmlDir = dirname(activeFile);
    setError(null);
    try {
      const rewritten = await buildHtmlPreviewWithLinkedAssets(
        currentContent,
        htmlDir,
        readFile
      );
      await createDirectory(PREVIEW_TEMP_DIR);
      const tempPath = `${PREVIEW_TEMP_DIR}/${crypto.randomUUID()}.html`;
      await writeFile(tempPath, rewritten);
      setHtmlPreviewContent(rewritten);
      setHtmlPreviewTempPath(tempPath);
      setHtmlPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build preview");
    }
  }, [activeFile, currentContent]);

  const handleHtmlStop = useCallback(() => {
    handleHtmlPreviewClose();
  }, [handleHtmlPreviewClose]);

  const handleCreateEditor = useCallback(
    (view: import("@codemirror/view").EditorView) => {
      editorViewRef.current = view;
      const bridge = {
        setContent(content: string, path?: string) {
          const targetPath = path ?? activeFileRef.current;
          if (targetPath) {
            setContentByPath((prev) => ({ ...prev, [targetPath]: content }));
            setLoadedContentByPath((prev) => ({ ...prev, [targetPath]: content }));
            if (path) {
              setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]));
              setActiveFile(path);
              setFileTreeRefreshTrigger((t) => t + 1);
            }
          }
          // Do not dispatch into the editor here: the visible tab may not have
          // re-rendered yet, so we could overwrite the wrong file and trigger
          // onChange for the wrong path. Rely on state only; the editor value
          // is driven by contentByPath[activeFile] so the correct content will
          // show when React re-renders.
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
          refreshTrigger={fileTreeRefreshTrigger}
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
              {activeFile && isHtmlFile(activeFile) && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleHtmlRun}
                    title="Run HTML preview"
                  >
                    <Play className="size-3.5" />
                    Run
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={handleHtmlStop}
                    disabled={!htmlPreviewOpen}
                    title="Close HTML preview"
                  >
                    <Square className="size-3.5" />
                    Stop
                  </Button>
                </>
              )}
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
                key={activeFile}
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
      <Dialog
        open={htmlPreviewOpen}
        onOpenChange={(open) => {
          if (!open) handleHtmlPreviewClose();
          else setHtmlPreviewOpen(true);
        }}
      >
        <DialogContent className="max-w-[90vw] w-full h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b border-border px-4 py-2">
            <DialogTitle className="text-sm">HTML Preview</DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Close preview"
              >
                <X className="size-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden bg-background">
            <iframe
              title="HTML preview"
              sandbox="allow-scripts allow-same-origin"
              srcDoc={htmlPreviewContent}
              className="w-full h-full border-0"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
