"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { listDirectory, readFile, writeFile, createDirectory, deletePath } from "@/lib/file-system";
import type { AppProps } from "@/lib/types";

/** Command names for Tab completion */
const COMMAND_NAMES = [
  "help", "?", "clear", "cls", "pwd", "ls", "cd", "cat", "mkdir", "touch", "rm", "echo", "id",
];

/** Commands that take a path argument (for path completion) */
const PATH_COMMANDS = new Set(["ls", "cd", "cat", "mkdir", "touch", "rm"]);

/** Regex per command: full line must match. Ensures unique format per command. */
const COMMAND_FORMATS: Record<string, RegExp> = {
  help: /^help\s*$/,
  "?": /^\?\s*$/,
  clear: /^clear\s*$/,
  cls: /^cls\s*$/,
  id: /^id\s*$/,
  pwd: /^pwd\s*$/,
  echo: /^echo(\s+.*)?$/,
  ls: /^ls(\s+.+)?$/,
  cd: /^cd(\s*|\s+.+)$/,
  cat: /^cat\s+.+$/,
  mkdir: /^mkdir\s+.+$/,
  touch: /^touch\s+.+$/,
  rm: /^rm\s+.+$/,
};

const IDOS_ASCII_ART = `
_________ ______   _______  _______ 
\\__   __/(  __  \\ (  ___  )(  ____ \\
   ) (   | (  \\  )| (   ) || (    \\/
   | |   | |   ) || |   | || (_____ 
   | |   | |   | || |   | |(_____  )
   | |   | |   ) || |   | |      ) |
___) (___| (__/  )| (___) |/\\____) |
\\_______/(______/ (_______)\\_______)
`.trim();

const PROMPT_SPACING = "\u00A0"; // non-breaking space so it doesn't collapse in HTML

function formatPrompt(cwd: string): string {
  const display = cwd === "/" ? "~" : cwd;
  return `idos@system ${display} % ${PROMPT_SPACING}`;
}

type OutputLine =
  | { type: "art" | "welcome" | "prompt" | "command" | "output" | "error"; text: string }
  | { type: "ls"; entries: string[] };

function longestCommonPrefix(words: string[]): string {
  if (words.length === 0) return "";
  let i = 0;
  const first = words[0];
  while (i < first.length && words.every((w) => w[i] === first[i])) i++;
  return first.slice(0, i);
}

/** Resolve a path relative to cwd. Handles ., .., ~, and absolute paths. */
function resolvePath(cwd: string, raw: string): string {
  let p = raw.replace(/\\/g, "/").trim();
  if (!p) return cwd;
  if (p === "~" || p.startsWith("~/")) {
    p = p === "~" ? "/" : "/" + p.slice(2);
  }
  if (!p.startsWith("/")) {
    p = (cwd.endsWith("/") ? cwd : cwd + "/") + p;
  }
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

type RunResult = {
  lines: string[];
  clear?: boolean;
  newCwd?: string;
  error?: boolean;
  lsEntries?: string[];
};

async function runCommand(cmd: string, cwd: string): Promise<RunResult> {
  const trimmed = cmd.trim();
  const args = trimmed.split(/\s+/);
  const first = (args[0] ?? "").toLowerCase();

  // Validate command format with regex (unique format per command)
  const format = COMMAND_FORMATS[first];
  if (format && !format.test(trimmed)) {
    return {
      lines: [`Invalid format for '${first}'. Type 'help' for usage.`],
      error: true,
    };
  }

  if (first === "help" || first === "?") {
    return {
      lines: [
        "IDOS Terminal — available commands:",
        "  help, ?       — show this help",
        "  clear, cls    — clear screen",
        "  pwd           — print working directory",
        "  ls [path]     — list directory contents",
        "  cd <path>     — change directory",
        "  cat <path>    — print file contents",
        "  mkdir <path>  — create directory",
        "  touch <path>  — create empty file",
        "  rm <path>     — remove file or directory",
        "  echo <text>   — print text",
        "  id            — show IDOS info",
      ],
    };
  }
  if (first === "clear" || first === "cls") {
    return { lines: [], clear: true };
  }
  if (first === "id") {
    return {
      lines: [
        "IDOS — Intent-Driven Operating System",
        "Terminal v1.0 | Virtual file system",
      ],
    };
  }
  if (first === "echo") {
    return { lines: [args.slice(1).join(" ") ?? ""] };
  }

  if (first === "pwd") {
    return { lines: [cwd === "/" ? "/" : cwd] };
  }

  if (first === "ls") {
    const pathArg = args[1];
    const dir = pathArg ? resolvePath(cwd, pathArg) : cwd;
    try {
      const entries = await listDirectory(dir);
      if (entries.length === 0) return { lines: [] };
      return { lines: [], lsEntries: entries };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { lines: [`ls: ${msg}`], error: true };
    }
  }

  if (first === "cd") {
    const pathArg = args[1];
    if (!pathArg) return { lines: [cwd] };
    const target = resolvePath(cwd, pathArg);
    return { lines: [], newCwd: target };
  }

  if (first === "cat") {
    const pathArg = args[1];
    if (!pathArg) return { lines: ["cat: missing path"], error: true };
    const target = resolvePath(cwd, pathArg);
    try {
      const content = await readFile(target);
      return { lines: content ? content.split(/\r?\n/) : [""] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { lines: [`cat: ${msg}`], error: true };
    }
  }

  if (first === "mkdir") {
    const pathArg = args[1];
    if (!pathArg) return { lines: ["mkdir: missing path"], error: true };
    const target = resolvePath(cwd, pathArg);
    try {
      await createDirectory(target);
      return { lines: [] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { lines: [`mkdir: ${msg}`], error: true };
    }
  }

  if (first === "touch") {
    const pathArg = args[1];
    if (!pathArg) return { lines: ["touch: missing path"], error: true };
    const target = resolvePath(cwd, pathArg);
    try {
      await writeFile(target, "");
      return { lines: [] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { lines: [`touch: ${msg}`], error: true };
    }
  }

  if (first === "rm") {
    const pathArg = args[1];
    if (!pathArg) return { lines: ["rm: missing path"], error: true };
    const target = resolvePath(cwd, pathArg);
    try {
      await deletePath(target);
      return { lines: [] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { lines: [`rm: ${msg}`], error: true };
    }
  }

  if (!trimmed) return { lines: [] };
  return { lines: [`Unknown command: ${trimmed}. Type 'help' for commands.`], error: true };
}

const MAX_HISTORY = 100;

export function TerminalApp({ id, dimensions }: AppProps) {
  const [cwd, setCwd] = useState("/");
  const [outputLines, setOutputLines] = useState<OutputLine[]>(() => [
    { type: "art", text: IDOS_ASCII_ART },
    { type: "welcome", text: "Type `help` for commands." },
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [outputLines.length]);

  const submit = useCallback(() => {
    const line = input.trim();
    setInput("");
    setHistoryIndex(-1);
    setDraft("");

    if (!line) return;

    setCommandHistory((prev) => {
      const next = prev[0] === line ? prev : [line, ...prev].slice(0, MAX_HISTORY);
      return next;
    });

    const promptStr = formatPrompt(cwd);
    void runCommand(line, cwd).then(
      ({ lines, clear: doClear, newCwd: nextCwd, error: isError, lsEntries }) => {
        if (nextCwd !== undefined) setCwd(nextCwd);
        setOutputLines((prev) => {
          const commandLine = { type: "command" as const, text: promptStr + line };
          const textLines = lines.map((t) =>
            isError ? ({ type: "error" as const, text: t }) : ({ type: "output" as const, text: t })
          );
          const lsBlock =
            lsEntries && lsEntries.length > 0 ? [{ type: "ls" as const, entries: lsEntries }] : [];
          const base = doClear
            ? [
                { type: "art" as const, text: IDOS_ASCII_ART },
                { type: "welcome" as const, text: "Type `help` for commands." },
              ]
            : [...prev, commandLine, ...lsBlock, ...textLines];
          return base;
        });
      }
    );
  }, [input, cwd]);

  const tryTabComplete = useCallback(
    async (value: string, cursorPos: number) => {
      const beforeCursor = value.slice(0, cursorPos);
      const tokenStart = beforeCursor.lastIndexOf(" ") + 1;
      const tokenEnd = cursorPos;
      const token = value.slice(tokenStart, tokenEnd);
      const parts = beforeCursor.trimEnd().split(/\s+/);
      const isFirstWord = parts.length <= 1 && beforeCursor.trim().length > 0;

      if (isFirstWord) {
        const prefix = token.toLowerCase();
        const matches = COMMAND_NAMES.filter((c) => c.startsWith(prefix) || (c === "?" && prefix === ""));
        if (matches.length === 0) return;
        if (matches.length === 1) {
          const completion = matches[0] + (beforeCursor.endsWith(" ") ? "" : " ");
          setInput(value.slice(0, tokenStart) + completion + value.slice(cursorPos));
          return;
        }
        const common = longestCommonPrefix(matches.filter((m) => m !== "?"));
        if (common && common.length > token.length) {
          setInput(value.slice(0, tokenStart) + common + value.slice(cursorPos));
        }
        return;
      }

      const firstWord = parts[0]?.toLowerCase() ?? "";
      if (!PATH_COMMANDS.has(firstWord)) return;

      const pathToken = token.replace(/\\/g, "/").trim();
      const baseDir = pathToken.includes("/")
        ? resolvePath(cwd, pathToken.slice(0, pathToken.lastIndexOf("/") + 1))
        : cwd;
      const prefix = pathToken.includes("/") ? pathToken.slice(pathToken.lastIndexOf("/") + 1) : pathToken;

      try {
        const entries = await listDirectory(baseDir === "" ? "/" : baseDir);
        const matches = prefix
          ? entries.filter((e) => e.toLowerCase().startsWith(prefix.toLowerCase()))
          : entries;
        if (matches.length === 0) return;
        const pathPrefix = pathToken.includes("/") ? pathToken.slice(0, pathToken.lastIndexOf("/") + 1) : "";
        if (matches.length === 1) {
          const completion = pathPrefix + matches[0] + (pathToken.endsWith("/") ? "" : " ");
          setInput(value.slice(0, tokenStart) + completion + value.slice(cursorPos));
          return;
        }
        const common = longestCommonPrefix(matches);
        if (common && common.length > prefix.length) {
          setInput(value.slice(0, tokenStart) + pathPrefix + common + value.slice(cursorPos));
        }
      } catch {
        // ignore
      }
    },
    [cwd]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length === 0) return;
        if (historyIndex === -1) setDraft(input);
        const nextIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex <= -1) return;
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(nextIndex === -1 ? draft : commandHistory[nextIndex]);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const el = inputRef.current;
        if (!el) return;
        const start = el.selectionStart ?? input.length;
        void tryTabComplete(input, start);
        return;
      }
    },
    [submit, commandHistory, historyIndex, draft, input, tryTabComplete]
  );

  return (
    <div
      id={id}
      className="flex h-full flex-col overflow-hidden rounded bg-[oklch(0.08_0.02_265)] font-mono text-sm text-[oklch(0.85_0.02_265)]"
      data-terminal-output
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto px-3 py-3"
      >
        {outputLines.map((line, i) =>
          line.type === "ls" ? (
            <div key={i} className="my-1.5">
              <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(11ch,1fr))] gap-x-6 gap-y-0.5">
                {line.entries.map((entry, j) => (
                  <div
                    key={j}
                    className="truncate rounded px-1.5 py-0.5 text-[oklch(0.88_0.02_265)] transition-colors hover:bg-[oklch(0.18_0.02_265)] hover:text-[oklch(0.95_0.02_265)]"
                    title={entry}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              key={i}
              className={
                line.type === "art"
                  ? "whitespace-pre text-[oklch(0.65_0.22_265)]"
                  : line.type === "prompt" || line.type === "command"
                    ? "text-[oklch(0.75_0.15_265)]"
                    : line.type === "welcome"
                      ? "text-[oklch(0.6_0.02_265)]"
                      : line.type === "error"
                        ? "text-[oklch(0.7_0.2_25)]"
                        : "text-[oklch(0.8_0.02_265)]"
              }
            >
              {line.type === "art" ? (
                <pre className="m-0 leading-tight">{line.text}</pre>
              ) : (
                line.text
              )}
            </div>
          )
        )}
        <div className="flex items-baseline">
          <span className="shrink-0 text-[oklch(0.75_0.15_265)]">{formatPrompt(cwd)}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-w-[8ch] flex-1 border-none bg-transparent font-mono text-inherit outline-none placeholder:text-[oklch(0.45_0.02_265)]"
            placeholder=""
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
