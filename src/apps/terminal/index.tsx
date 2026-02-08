"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { listDirectory, readFile, writeFile, createDirectory, deletePath } from "@/lib/file-system";
import type { AppProps } from "@/lib/types";

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
  const t = trimmed.toLowerCase();
  const args = trimmed.split(/\s+/);
  const first = args[0] ?? "";

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

export function TerminalApp({ id, dimensions }: AppProps) {
  const [cwd, setCwd] = useState("/");
  const [outputLines, setOutputLines] = useState<OutputLine[]>(() => [
    { type: "art", text: IDOS_ASCII_ART },
    { type: "welcome", text: "Type `help` for commands." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [outputLines.length]);

  const submit = useCallback(() => {
    const line = input.trim();
    setInput("");

    if (!line) return;

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  return (
    <div
      id={id}
      ref={scrollRef}
      className="flex h-full flex-col overflow-y-auto overflow-x-auto rounded bg-[oklch(0.08_0.02_265)] font-mono text-sm text-[oklch(0.85_0.02_265)]"
      style={{ minHeight: dimensions?.height ?? 400 }}
      data-terminal-output
    >
      <div className="min-h-0 flex-1 px-3 py-3">
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
