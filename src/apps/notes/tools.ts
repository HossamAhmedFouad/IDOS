"use client";

import { writeFile, readFile, listDirectory } from "@/lib/file-system";
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
        },
        required: ["filename", "content"],
      },
      execute: async (params) => {
        const filename = String(params.filename ?? "").trim() || "note.txt";
        const path = `${NOTES_PREFIX}/${filename}`;
        await writeFile(path, String(params.content ?? ""));
        return {
          success: true,
          data: { path },
          uiUpdate: { type: "flash", targetId: appInstanceId },
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
        const matches: { path: string; snippet: string }[] = [];
        for (const name of names) {
          const path = `${NOTES_PREFIX}/${name}`;
          try {
            const content = await readFile(path);
            if (content.toLowerCase().includes(query)) {
              const idx = content.toLowerCase().indexOf(query);
              const start = Math.max(0, idx - 30);
              const end = Math.min(content.length, idx + query.length + 50);
              matches.push({ path, snippet: content.slice(start, end) });
            }
          } catch {
            // skip unreadable
          }
        }
        return { success: true, data: { matches } };
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
          uiUpdate: { type: "flash", targetId: appInstanceId },
        };
      },
    },
  ];
}
