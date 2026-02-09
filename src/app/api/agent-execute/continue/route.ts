import { NextRequest } from "next/server";
import { agentSessions, cleanupSessions } from "../session-store";
import {
  isInvalidApiKeyError,
  INVALID_API_KEY_MESSAGE,
  API_KEY_INVALID_CODE,
} from "@/lib/gemini/api-key-error";

function sendSSE(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown
) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

export async function POST(request: NextRequest) {
  let body: {
    sessionId?: string;
    toolName?: string;
    toolResult?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const toolName = typeof body.toolName === "string" ? body.toolName : "";
  const toolResult = body.toolResult;

  if (!sessionId || !toolName) {
    return new Response(
      JSON.stringify({ error: "Missing sessionId or toolName" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  cleanupSessions();
  const entry = agentSessions.get(sessionId);
  if (!entry) {
    return new Response(JSON.stringify({ error: "Session not found or expired" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  entry.createdAt = Date.now();

  const { chat } = entry;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const functionResponsePart = {
          functionResponse: {
            name: toolName,
            response: toolResult ?? { success: false, error: "No result" },
          },
        };

        const result = await chat.sendMessage([functionResponsePart]);
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
          });
        }
      } catch (err) {
        const message = isInvalidApiKeyError(err)
          ? INVALID_API_KEY_MESSAGE
          : err instanceof Error
            ? err.message
            : "Unknown error";
        sendSSE(controller, "error", {
          message,
          ...(isInvalidApiKeyError(err) && { code: API_KEY_INVALID_CODE }),
        });
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
