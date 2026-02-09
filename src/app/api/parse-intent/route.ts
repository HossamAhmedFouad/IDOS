import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  isInvalidApiKeyError,
  INVALID_API_KEY_MESSAGE,
  API_KEY_INVALID_CODE,
} from "@/lib/gemini/api-key-error";
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
      "type": "notes|timer|todo|code-editor|quiz|email|calendar|file-browser|whiteboard|ai-chat|explanation-panel",
      "x": 0,
      "y": 0,
      "width": 400,
      "height": 350,
      "config": { "filePath": "/path/to/file.txt" }
    }
  ],
  "layoutStrategy": "floating|grid|split|tiled",
  "modes": ["dark", "dnd"]
}

App type mapping:
- notes, take notes, writing, document -> notes
- timer, pomodoro, countdown, focus session -> timer
- todo, tasks, checklist, project management -> todo
- code, programming, coding, edit code -> code-editor
- quiz, study, flashcards, learning, memorize -> quiz
- email, write email, draft, compose -> email
- ai chat, assistant, help me with -> ai-chat
- calendar, schedule, events, time blocking -> calendar
- files, browse, file browser, organize files -> file-browser
- whiteboard, brainstorm, diagram, draw -> whiteboard
- help, explanation, how to, contextual help -> explanation-panel

Mode inference (add to modes array when intent suggests):
- "dark": night, late, dark theme, reduce eye strain, evening
- "dnd": meeting, presentation, do not disturb, no interruptions, busy

Layout strategy:
- "floating": default, free placement, overlapping windows
- "grid": organized, tidy, side by side (2-4 apps)
- "split": compare, side by side, two main apps
- "tiled": many apps, automatic arrangement, maximize space

Examples:
- "take notes and set a 25 min timer" -> notes + timer
- "deep work with notes and timer" -> notes + timer
- "meeting prep: calendar and notes" -> calendar + notes, modes: [dnd]
- "code and browse files" -> code-editor + file-browser, layoutStrategy: split
- "study for exam with flashcards and AI help" -> quiz + ai-chat
- "write email draft" -> email with filePath
- "night coding session" -> code-editor, modes: [dark]

Rules:
- Generate unique ids: "app-notes-1", "app-timer-2", etc.
- For Notes, Todo, Email, Code Editor, Quiz: add config.filePath when relevant (e.g. "/notes/draft.txt", "/code/main.js").
- If intent is vague or empty, default to notes + timer with floating layout.
- Prefer multiple apps when intent implies several activities (e.g. "notes and timer" -> both).
`;

const VALID_APP_TYPES: AppId[] = [
  "notes", "timer", "todo", "code-editor", "quiz", "email",
  "calendar", "file-browser", "whiteboard", "ai-chat", "explanation-panel",
  "terminal",
];
const VALID_LAYOUTS: LayoutStrategy[] = ["floating", "grid", "split", "tiled"];
const VALID_MODES: SystemMode[] = ["dark", "dnd"];

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
    const headerKey = request.headers.get("x-gemini-api-key")?.trim();
    const envKey =
      process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const apiKey = headerKey && headerKey.length > 0 ? headerKey : envKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is required. Add it in Settings." },
        { status: 401 }
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
    if (isInvalidApiKeyError(err)) {
      return NextResponse.json(
        { error: INVALID_API_KEY_MESSAGE, code: API_KEY_INVALID_CODE },
        { status: 401 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
