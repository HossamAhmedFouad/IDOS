"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";
import { useToolRegistry } from "@/store/use-tool-registry";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useAgentStore } from "@/store/use-agent-store";
import { uiUpdateExecutor } from "@/lib/uiUpdateExecutor";
import { createTimerTools } from "./tools";

const TIMER_STATE_PATH = "/timer/state.json";

interface TimerState {
  durationSeconds: number;
  startedAt: number | null;
}

function parseTimerState(raw: string): TimerState {
  try {
    const data = JSON.parse(raw);
    return {
      durationSeconds: typeof data?.durationSeconds === "number" ? data.durationSeconds : 25 * 60,
      startedAt: typeof data?.startedAt === "number" ? data.startedAt : null,
    };
  } catch {
    return { durationSeconds: 25 * 60, startedAt: null };
  }
}

export function TimerApp({ id, config }: AppProps) {
  const registerTool = useToolRegistry((s) => s.registerTool);
  const unregisterTool = useToolRegistry((s) => s.unregisterTool);
  const timerTools = useMemo(() => createTimerTools(id), [id]);

  useEffect(() => {
    timerTools.forEach((tool) => registerTool(tool));
    return () => timerTools.forEach((tool) => unregisterTool(tool.name));
  }, [timerTools, registerTool, unregisterTool]);

  const [seconds, setSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [preset, setPreset] = useState(25);
  const [loading, setLoading] = useState(true);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await readFile(TIMER_STATE_PATH);
      const state = parseTimerState(raw);
      setPreset(Math.round(state.durationSeconds / 60));
      if (state.startedAt !== null) {
        const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        const remaining = Math.max(0, state.durationSeconds - elapsed);
        setSeconds(remaining);
        setIsRunning(remaining > 0);
      } else {
        setSeconds(state.durationSeconds);
        setIsRunning(false);
      }
    } catch {
      setSeconds(25 * 60);
      setPreset(25);
      setIsRunning(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const view = useWorkspaceStore((s) => s.view);
  const agentDataVersion = useAgentStore((s) => s.agentDataVersion);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (view === "agent" && agentDataVersion > 0) {
      loadState();
    }
  }, [view, agentDataVersion, loadState]);

  useEffect(() => {
    if (!isRunning) return;
    const intervalId = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setIsRunning(false);
          void writeFile(TIMER_STATE_PATH, JSON.stringify({ durationSeconds: 0, startedAt: null }, null, 2));
          void uiUpdateExecutor.execute({
            type: "timer_complete_celebration",
            targetId: id,
            message: "Timer complete!",
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isRunning, id]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleStart = useCallback(async () => {
    const state = { durationSeconds: seconds, startedAt: Date.now() };
    await writeFile(TIMER_STATE_PATH, JSON.stringify(state, null, 2));
    setIsRunning(true);
  }, [seconds]);

  const handlePause = useCallback(async () => {
    await writeFile(
      TIMER_STATE_PATH,
      JSON.stringify({ durationSeconds: seconds, startedAt: null }, null, 2)
    );
    setIsRunning(false);
  }, [seconds]);

  const handleReset = useCallback(async () => {
    const newSeconds = preset * 60;
    await writeFile(
      TIMER_STATE_PATH,
      JSON.stringify({ durationSeconds: newSeconds, startedAt: null }, null, 2)
    );
    setIsRunning(false);
    setSeconds(newSeconds);
  }, [preset]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div id={id} className="relative flex h-full flex-col items-center justify-center gap-4 p-6">
      <div data-timer-display className="text-4xl font-mono font-medium tabular-nums text-foreground">
        {formatTime(seconds)}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={isRunning}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Start
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!isRunning}
          className="rounded bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          Pause
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Reset
        </button>
      </div>
      <div className="flex gap-2">
        {[5, 15, 25, 45].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setPreset(m);
              setSeconds(m * 60);
              setIsRunning(false);
            }}
            className={`rounded px-3 py-1 text-sm ${
              preset === m
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>
    </div>
  );
}
