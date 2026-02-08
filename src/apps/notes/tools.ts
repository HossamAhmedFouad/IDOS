"use client";

import { writeFile, readFile, listDirectory, deleteFile } from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";

const NOTES_PREFIX = "/notes";

/**
 * Create notes tools that use the given app instance id for uiUpdate.targetId.
 */
export function createNotesTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "notes_create_note",
      description: "Create a new note with specified content and save to the file system under /notes/",
      appId: "notes",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "Note filename (e.g. 'meeting.txt')" },
          content: { type: "string", description: "Note content" },
          animated: {
            type: "boolean",
            description:
              "Use typewriter effect so the user sees content being written (default: true for better UX)",
          },
        },
        required: ["filename", "content"],
      },
      execute: async (params) => {
        const filename = String(params.filename ?? "").trim() || "note.txt";
        const content = String(params.content ?? "");
        const path = `${NOTES_PREFIX}/${filename}`;
        await writeFile(path, content);
        const animated = params.animated !== false;
        return {
          success: true,
          data: { path },
          uiUpdate: animated
            ? {
                type: "notes_typewriter",
                targetId: appInstanceId,
                content,
                speed: 35,
                cursor: true,
              }
            : {
                type: "notes_file_create_animation",
                targetId: appInstanceId,
                filename,
                position: { x: typeof window !== "undefined" ? window.innerWidth / 2 : 0, y: 100 },
              },
        };
      },
    },
    {
      name: "notes_search_notes",
      description: "Search notes under /notes by content. Returns list of matching file paths and snippets.",
      appId: "notes",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (text to find in note content)" },
        },
        required: ["query"],
      },
      execute: async (params) => {
        const query = String(params.query ?? "").toLowerCase();
        if (!query) {
          return { success: true, data: { matches: [] } };
        }
        const names = await listDirectory(NOTES_PREFIX);
        const matches: { path: string; snippet: string; line: number; text: string }[] = [];
        for (const name of names) {
          const path = `${NOTES_PREFIX}/${name}`;
          try {
            const content = await readFile(path);
            if (content.toLowerCase().includes(query)) {
              const idx = content.toLowerCase().indexOf(query);
              const start = Math.max(0, idx - 30);
              const end = Math.min(content.length, idx + query.length + 50);
              const snippet = content.slice(start, end);
              const line = content.slice(0, idx).split("\n").length;
              matches.push({ path, snippet, line, text: snippet });
            }
          } catch {
            // skip unreadable
          }
        }
        return {
          success: true,
          data: { matches: matches.map((m) => ({ path: m.path, snippet: m.snippet })) },
          uiUpdate:
            matches.length > 0
              ? {
                  type: "notes_search_highlight",
                  targetId: appInstanceId,
                  matches: matches.map((m) => ({ line: m.line, text: m.text })),
                  scrollToFirst: true,
                }
              : undefined,
        };
      },
    },
    {
      name: "notes_append_to_note",
      description: "Append content to an existing note file.",
      appId: "notes",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Full path to note (e.g. /notes/meeting.txt)" },
          content: { type: "string", description: "Content to append" },
        },
        required: ["path", "content"],
      },
      execute: async (params) => {
        const path = String(params.path ?? "").trim();
        const content = String(params.content ?? "");
        if (!path) return { success: false, error: "path is required" };
        let existing = "";
        try {
          existing = await readFile(path);
        } catch {
          existing = "";
        }
        await writeFile(path, existing + content);
        return {
          success: true,
          data: { path },
          uiUpdate: {
            type: "notes_append_scroll",
            targetId: appInstanceId,
            content,
            highlight: true,
          },
        };
      },
    },
    {
      name: "notes_delete_note",
      description: "Delete a note by its path. Path must be under /notes/ (e.g. /notes/meeting.txt). Use after listing or searching notes to get the path.",
      appId: "notes",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Full path to the note (e.g. /notes/meeting.txt)" },
        },
        required: ["path"],
      },
      execute: async (params) => {
        const path = String(params.path ?? "").trim();
        if (!path) return { success: false, error: "path is required" };
        const normalized = path.replace(/\\/g, "/");
        if (!normalized.startsWith(NOTES_PREFIX + "/") && normalized !== NOTES_PREFIX) {
          return { success: false, error: "Path must be under /notes/" };
        }
        try {
          await deleteFile(path);
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : "Failed to delete note" };
        }
        return { success: true, data: { path } };
      },
    },
  ];
}
