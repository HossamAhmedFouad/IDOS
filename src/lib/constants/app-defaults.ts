import type { AppId } from "@/lib/types/app";

/** Minimum window dimensions in pixels */
export const MIN_WINDOW_WIDTH = 200;
export const MIN_WINDOW_HEIGHT = 150;

/** Default dimensions for each app type when not specified */
export const APP_DEFAULT_SIZES: Record<AppId, { width: number; height: number }> =
  {
    notes: { width: 400, height: 350 },
    timer: { width: 320, height: 280 },
    todo: { width: 380, height: 400 },
    "code-editor": { width: 800, height: 500 },
    quiz: { width: 450, height: 380 },
    email: { width: 450, height: 420 },
    calendar: { width: 720, height: 560 },
    "file-browser": { width: 400, height: 450 },
    whiteboard: { width: 550, height: 450 },
    "ai-chat": { width: 420, height: 500 },
    "explanation-panel": { width: 380, height: 350 },
    terminal: { width: 640, height: 400 },
  };
