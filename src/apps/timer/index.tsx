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
      <div className="text-4xl font-mono font-medium tabular-nums text-foreground">
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
