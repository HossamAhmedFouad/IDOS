import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  isInvalidApiKeyError,
  INVALID_API_KEY_MESSAGE,
  API_KEY_INVALID_CODE,
} from "@/lib/gemini/api-key-error";

const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-3-flash-preview";

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-gemini-api-key")?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is required. Add it in Settings.", code: "API_KEY_REQUIRED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserContent = typeof body?.message === "string" ? body.message.trim() : null;

    if (!lastUserContent && messages.length === 0) {
      return NextResponse.json(
        { error: "Your message couldn't be sent. Please try again." },
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
        { error: "Your message couldn't be sent. Please try again." },
        { status: 400 }
      );
    }

    const result = await chat.sendMessage(textToSend);
    const response = result.response;
    const reply = response.text();

    if (reply == null || reply === "") {
      return NextResponse.json(
        { error: "The assistant couldn't generate a response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: reply });
  } catch (err) {
    if (isInvalidApiKeyError(err)) {
      return NextResponse.json(
        { error: INVALID_API_KEY_MESSAGE, code: API_KEY_INVALID_CODE },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
