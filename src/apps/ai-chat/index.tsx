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
    // Placeholder: no backend for AI responses in Phase 1
    setTimeout(() => {
      const assistantMsg: Message = {
        id: `m-${Date.now()}`,
        role: "assistant",
        content: "AI Chat is a placeholder. Connect to an AI backend in Phase 2.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
    }, 500);
  }, [input]);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex-1 space-y-3 overflow-auto">
        {messages.length === 0 && (
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Start a conversation. AI responses will be available when connected to a backend.
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
