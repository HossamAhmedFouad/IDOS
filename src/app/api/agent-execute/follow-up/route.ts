import { NextRequest } from "next/server";
import { agentSessions, cleanupSessions } from "../session-store";

function sendSSE(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown
) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

const MAX_ATTACHED_FILES = 5;
const MAX_FILE_CONTENT_LENGTH = 8000;

/** Continue the same chat with a new user message (follow-up intent). */
export async function POST(request: NextRequest) {
  let body: {
    sessionId?: string;
    intent?: string;
    attachedFiles?: Array<{ path?: string; content?: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const intent =
    typeof body.intent === "string" ? body.intent.trim() : "";

  const rawAttached = Array.isArray(body.attachedFiles) ? body.attachedFiles : [];
  const attachedFiles = rawAttached
    .slice(0, MAX_ATTACHED_FILES)
    .map((f) => {
      const path = typeof f.path === "string" ? f.path.trim() : "";
      let content = typeof f.content === "string" ? f.content : "";
      if (content.length > MAX_FILE_CONTENT_LENGTH) {
        content = content.slice(0, MAX_FILE_CONTENT_LENGTH) + "\n...[truncated]";
      }
      return { path, content };
    })
    .filter((f) => f.path.length > 0);

  if (!sessionId || !intent) {
    return new Response(
      JSON.stringify({ error: "Missing sessionId or intent" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  cleanupSessions();
  const entry = agentSessions.get(sessionId);
  if (!entry) {
    return new Response(
      JSON.stringify({ error: "Session not found or expired" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  entry.createdAt = Date.now();

  const message =
    attachedFiles.length === 0
      ? intent
      : `Goal: ${intent}\n\nAttached files for context:\n\n${attachedFiles
          .map((f) => `--- File: ${f.path} ---\n${f.content}\n`)
          .join("\n")}`;

  const { chat } = entry;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        sendSSE(controller, "agent-start", { intent, sessionId });

        const result = await chat.sendMessage(message);
        const response = result.response;
        const text = response.text?.() ?? "";
        const functionCalls = response.functionCalls?.();

        if (functionCalls && functionCalls.length > 0) {
          const fc = functionCalls[0];
          sendSSE(controller, "tool-call", {
            toolName: fc.name,
            args: fc.args ?? {},
            thinking: text || `Calling ${fc.name}...`,
          });
        } else {
          sendSSE(controller, "agent-complete", {
            message: text || "Done.",
            iterations: 1,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        sendSSE(controller, "error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
