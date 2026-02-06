"use client";

import { useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";

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
          <div className="rounded-lg bg-zinc-100 p-4 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Start a conversation. AI responses will be available when connected to a backend.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg px-3 py-2 ${
              m.role === "user"
                ? "ml-8 bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                : "mr-8 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <span className="text-xs font-medium opacity-70">{m.role}</span>
            <p className="mt-1 text-sm">{m.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type a message..."
          disabled={loading}
          className="flex-1 rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-600 dark:hover:bg-zinc-500"
        >
          Send
        </button>
      </div>
    </div>
  );
}
