/**
 * Bridge so UIUpdateExecutor can drive the CodeMirror editor when it is rendered
 * (syntax highlighting, line numbers) instead of falling back to plain textarea DOM.
 */

export interface CodeEditorBridge {
  /** Set editor content. If path is provided, open that file and set its content (used when agent creates 2nd/3rd file). */
  setContent(content: string, path?: string): void;
  setLineHighlight(lineNumbers: number[], color: string, durationMs: number): void;
}

declare global {
  interface Window {
    __IDOS_CODEMIRROR_BRIDGES?: Record<string, CodeEditorBridge>;
  }
}

const KEY = "__IDOS_CODEMIRROR_BRIDGES";

export function registerCodeEditorBridge(appInstanceId: string, bridge: CodeEditorBridge): void {
  if (typeof window === "undefined") return;
  window[KEY] = window[KEY] ?? {};
  window[KEY][appInstanceId] = bridge;
}

export function unregisterCodeEditorBridge(appInstanceId: string): void {
  if (typeof window === "undefined") return;
  if (window[KEY]) {
    delete window[KEY][appInstanceId];
  }
}

export function getCodeEditorBridge(appInstanceId: string): CodeEditorBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return window[KEY]?.[appInstanceId];
}
