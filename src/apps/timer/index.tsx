"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppProps } from "@/lib/types";

export function TimerApp(props: AppProps) {
  const [seconds, setSeconds] = useState(25 * 60); // 25 min default
  const [isRunning, setIsRunning] = useState(false);
  const [preset, setPreset] = useState(25);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setIsRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleStart = useCallback(() => setIsRunning(true), []);
  const handlePause = useCallback(() => setIsRunning(false), []);
  const handleReset = useCallback(() => {
    setIsRunning(false);
    setSeconds(preset * 60);
  }, [preset]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="text-4xl font-mono font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
        {formatTime(seconds)}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={isRunning}
          className="rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        >
          Start
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!isRunning}
          className="rounded bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500"
        >
          Pause
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                ? "bg-zinc-800 text-white dark:bg-zinc-600"
                : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {m} min
          </button>
        ))}
      </div>
    </div>
  );
}
