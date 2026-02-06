"use client";

import { useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function AIChatApp(props: AppProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: `m-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const content = res.ok
        ? (data.message ?? "")
        : (data.error ?? `Error: ${res.status}`);
      const assistantMsg: Message = {
        id: `m-${Date.now()}`,
        role: "assistant",
        content: content || "No response.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: "assistant",
          content: "Could not reach the chat service. Check your connection and that GEMINI_API_KEY is set in .env.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages]);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex-1 space-y-3 overflow-auto">
        {messages.length === 0 && (
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Chat with Gemini. Type a message below and press Enter or Send. Make sure GEMINI_API_KEY is set in .env.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-3 py-2 ${
              m.role === "user"
                ? "ml-8 bg-primary text-primary-foreground"
                : "mr-8 bg-muted text-foreground"
            }`}
          >
            <span className="text-xs font-medium opacity-70">{m.role}</span>
            <p className="mt-1 text-sm">{m.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          disabled={loading}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
