import { NextRequest } from "next/server";
import type { ToolDefinitionForAI } from "@/lib/types/agent";
import {
  createAgentModel,
  buildAgentSystemInstruction,
  MAX_ITERATIONS,
} from "@/lib/gemini/agent-client";
import { agentSessions, cleanupSessions } from "./session-store";

function sendSSE(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown
) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const MAX_ATTACHED_FILES = 5;
  const MAX_FILE_CONTENT_LENGTH = 8000;

  let body: {
    intent?: string;
    toolDefinitions?: ToolDefinitionForAI[];
    sessionId?: string;
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

  const intent =
    typeof body.intent === "string" ? body.intent.trim() : "";
  const toolDefinitions = Array.isArray(body.toolDefinitions)
    ? body.toolDefinitions
    : [];
  const clientSessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";

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

  if (!intent) {
    return new Response(JSON.stringify({ error: "Missing intent" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  cleanupSessions();

  const sessionId =
    clientSessionId ||
    `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const systemInstruction = buildAgentSystemInstruction(
          intent,
          toolDefinitions.map((t) => ({ name: t.name, description: t.description }))
        );
        const model = createAgentModel(
          apiKey,
          toolDefinitions,
          systemInstruction
        );
        const chat = model.startChat({ history: [] });

        agentSessions.set(sessionId, { chat, createdAt: Date.now() });

        sendSSE(controller, "agent-start", { intent, sessionId });

        let iteration = 0;
        let message: string | undefined =
          attachedFiles.length === 0
            ? intent
            : `Goal: ${intent}\n\nAttached files for context:\n\n${attachedFiles
                .map(
                  (f) => `--- File: ${f.path} ---\n${f.content}\n`
                )
                .join("\n")}`;

        while (iteration < MAX_ITERATIONS) {
          iteration++;
          const result = await chat.sendMessage(
            message ?? "Continue with the next step."
          );
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
            break;
          }

          sendSSE(controller, "agent-complete", {
            message: text || "Done.",
            iterations: iteration,
          });
          break;
        }

        if (iteration >= MAX_ITERATIONS) {
          sendSSE(controller, "agent-timeout", {
            message: "Maximum iterations reached",
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
