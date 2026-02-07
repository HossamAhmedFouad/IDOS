"use client";

import { readFile, writeFile, createDirectory } from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";

const TIMER_STATE_PATH = "/timer/state.json";

interface TimerState {
  durationSeconds: number;
  startedAt: number | null;
}

async function loadTimerState(): Promise<TimerState> {
  try {
    const raw = await readFile(TIMER_STATE_PATH);
    const data = JSON.parse(raw);
    return {
      durationSeconds: typeof data?.durationSeconds === "number" ? data.durationSeconds : 25 * 60,
      startedAt: typeof data?.startedAt === "number" ? data.startedAt : null,
    };
  } catch {
    return { durationSeconds: 25 * 60, startedAt: null };
  }
}

/**
 * Create timer tools that use the given app instance id for uiUpdate.targetId.
 */
export function createTimerTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "timer_start",
      description: "Start the timer with a duration in seconds (e.g. 300 for 5 minutes)",
      appId: "timer",
      parameters: {
        type: "object",
        properties: {
          durationSeconds: {
            type: "number",
            description: "Duration in seconds (e.g. 300 for 5 min, 60 for 1 min)",
          },
        },
        required: ["durationSeconds"],
      },
      execute: async (params) => {
        const duration = Number(params.durationSeconds) || 60;
        try {
          await createDirectory("/timer");
        } catch {
          // Directory may already exist
        }
        const state: TimerState = {
          durationSeconds: duration,
          startedAt: Date.now(),
        };
        await writeFile(TIMER_STATE_PATH, JSON.stringify(state, null, 2));
        return {
          success: true,
          data: { durationSeconds: duration },
          uiUpdate: {
            type: "timer_start_ripple",
            targetId: appInstanceId,
            duration,
          },
        };
      },
    },
    {
      name: "timer_reset",
      description: "Reset and stop the timer",
      appId: "timer",
      parameters: {
        type: "object",
        properties: {
          presetMinutes: {
            type: "number",
            description: "Optional preset in minutes (e.g. 25 for 25 min)",
          },
        },
        required: [],
      },
      execute: async (params) => {
        const preset = Number(params.presetMinutes) || 25;
        const state: TimerState = {
          durationSeconds: preset * 60,
          startedAt: null,
        };
        await writeFile(TIMER_STATE_PATH, JSON.stringify(state, null, 2));
        return { success: true, data: { reset: true } };
      },
    },
    {
      name: "timer_pause",
      description: "Pause the running timer",
      appId: "timer",
      parameters: { type: "object", properties: {}, required: [] },
      execute: async () => {
        const current = await loadTimerState();
        const state: TimerState = {
          durationSeconds: current.durationSeconds,
          startedAt: null,
        };
        await writeFile(TIMER_STATE_PATH, JSON.stringify(state, null, 2));
        return { success: true, data: { paused: true } };
      },
    },
  ];
}
