import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AppId, AppInstance, WorkspaceConfig } from "@/lib/types";
import type { LayoutStrategy } from "@/lib/types/layout";
import type { SystemMode } from "@/lib/types/modes";
import { APP_DEFAULT_SIZES } from "@/lib/constants/app-defaults";

const SYSTEM_PROMPT = `You are an intent parser for an Intent-Driven OS. Given a user's natural language intent, output a JSON workspace configuration.

Respond ONLY with valid JSON in this exact shape (no markdown, no code blocks):
{
  "apps": [
    {
      "id": "unique-id-string",
      "type": "notes|timer|todo|code-editor|quiz|email|chat|calendar|file-browser|whiteboard|ai-chat|explanation-panel",
      "x": 0,
      "y": 0,
      "width": 400,
      "height": 350,
      "config": { "filePath": "/path/to/file.txt" }
    }
  ],
  "layoutStrategy": "floating|grid|split|tiled",
  "modes": ["focus", "dark", "dnd"]
}

Rules:
- apps: array of app instances. Use sensible defaults for x, y, width, height based on app type.
- layoutStrategy: "floating" for free placement, "grid" for organized layouts, "split" for side-by-side, "tiled" for auto-tiling.
- modes: include "dark" for night/dark theme, "focus" for deep work/studying, "dnd" for meetings.
- Generate unique ids like "app-notes-1", "app-timer-2".
- For Notes/Todo/Email apps, add config.filePath (e.g. "/notes/draft.txt").
- Infer apps from intent: "take notes" -> notes, "timer" -> timer, "todo list" -> todo, "write email" -> email, "chat" -> chat or ai-chat, "code" -> code-editor, "study" -> quiz, "calendar" -> calendar, "browse files" -> file-browser, "whiteboard" -> whiteboard, "help" -> explanation-panel.
- If intent is vague, default to notes + timer.
`;

const VALID_APP_TYPES: AppId[] = [
  "notes", "timer", "todo", "code-editor", "quiz", "email",
  "chat", "calendar", "file-browser", "whiteboard", "ai-chat", "explanation-panel",
];
const VALID_LAYOUTS: LayoutStrategy[] = ["floating", "grid", "split", "tiled"];
const VALID_MODES: SystemMode[] = ["focus", "dark", "dnd"];

function validateAndSanitize(config: unknown): WorkspaceConfig {
  if (!config || typeof config !== "object") {
    throw new Error("Invalid config: expected object");
  }
  const obj = config as Record<string, unknown>;
  const apps = Array.isArray(obj.apps) ? obj.apps : [];
  const layoutStrategy = typeof obj.layoutStrategy === "string" && VALID_LAYOUTS.includes(obj.layoutStrategy as LayoutStrategy)
    ? (obj.layoutStrategy as LayoutStrategy)
    : "floating";
  const modes = Array.isArray(obj.modes)
    ? obj.modes.filter((m): m is SystemMode => typeof m === "string" && VALID_MODES.includes(m as SystemMode))
    : [];

  const sanitizedApps = apps
    .map((app: unknown, i: number) => {
      if (!app || typeof app !== "object") return null;
      const a = app as Record<string, unknown>;
      const type = typeof a.type === "string" && VALID_APP_TYPES.includes(a.type as AppId)
        ? (a.type as AppId)
        : "notes";
      const defaults = APP_DEFAULT_SIZES[type];
      const instance: AppInstance = {
        id: typeof a.id === "string" ? a.id : `app-${i}-${Date.now()}`,
        type,
        x: typeof a.x === "number" ? a.x : 50 + i * 30,
        y: typeof a.y === "number" ? a.y : 50 + i * 30,
        width: typeof a.width === "number" ? a.width : defaults.width,
        height: typeof a.height === "number" ? a.height : defaults.height,
      };
      if (a.config && typeof a.config === "object") {
        instance.config = a.config as AppInstance["config"];
      }
      return instance;
    })
    .filter((a): a is AppInstance => a !== null);

  return {
    apps: sanitizedApps,
    layoutStrategy,
    modes,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const intent = typeof body?.intent === "string" ? body.intent.trim() : "";
    if (!intent) {
      return NextResponse.json(
        { error: "Missing or invalid intent string" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: SYSTEM_PROMPT,
    });
    const result = await model.generateContent(`Intent: ${intent}`);
    const text = result.response.text();
    if (!text) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim());
    const workspace = validateAndSanitize(parsed);
    return NextResponse.json({ workspace });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
