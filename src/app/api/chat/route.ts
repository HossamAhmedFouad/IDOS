import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-2.0-flash";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Add it to .env (see .env.example)." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserContent = typeof body?.message === "string" ? body.message.trim() : null;

    if (!lastUserContent && messages.length === 0) {
      return NextResponse.json(
        { error: "Send 'message' (string) or 'messages' array with at least one user message." },
        { status: 400 }
      );
    }

    type Role = "user" | "assistant";
    const history: { role: "user" | "model"; parts: { text: string }[] }[] = messages
      .filter((m: { role?: string; content?: string }) => m?.role && m?.content)
      .map((m: { role: string; content: string }) => ({
        role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
        parts: [{ text: String(m.content).trim() }],
      }))
      .filter((m : any) => m.parts[0].text.length > 0);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: CHAT_MODEL,
      systemInstruction: "You are a helpful assistant in an Intent-Driven OS. Be concise and clear.",
    });
    const chat = model.startChat({ history });

    const textToSend = lastUserContent ?? (history.length ? history[history.length - 1].parts[0].text : "");
    if (!textToSend) {
      return NextResponse.json(
        { error: "No message text to send." },
        { status: 400 }
      );
    }

    const result = await chat.sendMessage(textToSend);
    const response = result.response;
    const reply = response.text();

    if (reply == null || reply === "") {
      return NextResponse.json(
        { error: "Empty response from AI." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
