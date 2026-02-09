"use client";

import { readFile, writeFile } from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";

const DEFAULT_PATH = "/email/draft.json";

interface Draft {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

function parseDraft(json: string): Draft {
  try {
    const data = JSON.parse(json);
    return {
      to: typeof data?.to === "string" ? data.to : "",
      subject: typeof data?.subject === "string" ? data.subject : "",
      body: typeof data?.body === "string" ? data.body : "",
      html: typeof data?.html === "string" ? data.html : undefined,
    };
  } catch {
    return { to: "", subject: "", body: "" };
  }
}

/**
 * Create email tools that use the given app instance id for uiUpdate.targetId.
 */
export function createEmailTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "email_compose",
      description: "Compose or update an email draft (to, subject, body)",
      appId: "email",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body content" },
          html: {
            type: "string",
            description: "Optional HTML version of the email body for rich emails. When provided with body, the email is sent as multipart so providers can show HTML where supported and fall back to plain text.",
          },
          animated: {
            type: "boolean",
            description: "Use typewriter effect (default: true)",
          },
        },
        required: [],
      },
      execute: async (params) => {
        const filePath = DEFAULT_PATH;
        let draft: Draft;
        try {
          const raw = await readFile(filePath);
          draft = parseDraft(raw);
        } catch {
          draft = { to: "", subject: "", body: "" };
        }

        const toVal = params.to !== undefined ? String(params.to) : draft.to;
        const subjectVal = params.subject !== undefined ? String(params.subject) : draft.subject;
        const bodyVal = params.body !== undefined ? String(params.body) : draft.body;
        const htmlVal = params.html !== undefined ? String(params.html) : draft.html;

        const updates: { field: "to" | "subject" | "body"; content: string }[] = [];
        if (params.to !== undefined) updates.push({ field: "to", content: toVal });
        if (params.subject !== undefined) updates.push({ field: "subject", content: subjectVal });
        if (params.body !== undefined) updates.push({ field: "body", content: bodyVal });

        const newDraft: Draft = { to: toVal, subject: subjectVal, body: bodyVal, ...(htmlVal !== undefined && { html: htmlVal }) };
        await writeFile(filePath, JSON.stringify(newDraft, null, 2));

        const animated = params.animated !== false;
        const uiUpdates = animated && updates.length > 0
          ? updates.map((u) => ({
              type: "email_type_content" as const,
              targetId: appInstanceId,
              field: u.field,
              content: u.content,
              speed: 40,
            }))
          : [];

        if (uiUpdates.length === 1) {
          return {
            success: true,
            data: newDraft,
            uiUpdate: uiUpdates[0],
          };
        }
        if (uiUpdates.length > 1) {
          return {
            success: true,
            data: newDraft,
            multipleUpdates: uiUpdates,
          };
        }
        return { success: true, data: newDraft };
      },
    },
    {
      name: "email_send",
      description: "Send the current email draft (calls the send API)",
      appId: "email",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async () => {
        const filePath = DEFAULT_PATH;
        let draft: Draft;
        try {
          const raw = await readFile(filePath);
          draft = parseDraft(raw);
        } catch {
          return { success: false, error: "No draft to send" };
        }

        if (!draft.to?.trim()) {
          return { success: false, error: "Recipient (to) is required" };
        }

        try {
          const payload: { to: string; subject: string; text: string; html?: string } = {
            to: draft.to.trim(),
            subject: draft.subject?.trim() ?? "",
            text: draft.body?.trim() ?? "",
          };
          if (draft.html?.trim()) payload.html = draft.html.trim();
          const res = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          const success = res.ok;
          if (success) {
            const emptyDraft: Draft = { to: "", subject: "", body: "" };
            await writeFile(filePath, JSON.stringify(emptyDraft, null, 2));
          }
          return {
            success,
            data: success ? {} : { error: data?.error },
            uiUpdate: {
              type: "email_send_animation",
              targetId: appInstanceId,
              success,
              flyDirection: "up",
            },
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to send",
            uiUpdate: {
              type: "email_send_animation",
              targetId: appInstanceId,
              success: false,
              flyDirection: "up",
            },
          };
        }
      },
    },
    {
      name: "email_add_attachment",
      description: "Add an attachment to the draft (visual indicator only)",
      appId: "email",
      parameters: {
        type: "object",
        properties: {
          fileName: { type: "string", description: "Attachment file name" },
          fileSize: { type: "string", description: "File size (e.g. 1.2 MB)" },
        },
        required: ["fileName"],
      },
      execute: async (params) => {
        const fileName = String(params.fileName ?? "").trim();
        const fileSize = String(params.fileSize ?? "").trim() || "—";
        if (!fileName) return { success: false, error: "fileName is required" };
        return {
          success: true,
          data: { fileName, fileSize },
          uiUpdate: {
            type: "email_attachment_add",
            targetId: appInstanceId,
            fileName,
            fileSize,
          },
        };
      },
    },
    {
      name: "email_clear_draft",
      description: "Discard the current email draft. Clears to, subject, and body. Use when the user wants to start over or cancel the draft.",
      appId: "email",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
      execute: async () => {
        const emptyDraft = { to: "", subject: "", body: "" };
        await writeFile(DEFAULT_PATH, JSON.stringify(emptyDraft, null, 2));
        return { success: true, data: { cleared: true } };
      },
    },
  ];
}

