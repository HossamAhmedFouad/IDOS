"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AppProps } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/markdown-content";
import { useWorkspaceStore } from "@/store/use-workspace-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function parseStoredMessages(config: AppProps["config"]): Message[] {
  const raw = config?.chatMessages;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is Message =>
      m != null &&
      typeof m === "object" &&
      typeof (m as Message).id === "string" &&
      ((m as Message).role === "user" || (m as Message).role === "assistant") &&
      typeof (m as Message).content === "string"
  );
}

function getFriendlyErrorMessage(res: { status: number }, data: { error?: string }): string {
  switch (res.status) {
    case 400:
      return "Your message couldn't be sent. Please try again.";
    case 502:
      return "The assistant couldn't generate a response. Please try again.";
    case 503:
      return "Chat is not available right now. Please check your configuration.";
    case 500:
    default:
      return "Something went wrong. Please try again later.";
  }
}

export function AIChatApp(props: AppProps) {
  const [messages, setMessages] = useState<Message[]>(() => parseStoredMessages(props.config));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const updateAppConfig = useWorkspaceStore((s) => s.updateAppConfig);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    updateAppConfig(props.id, { chatMessages: messages });
  }, [messages, props.id, updateAppConfig]);

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
        : getFriendlyErrorMessage(res, data);
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
          content: "Could not reach the chat service. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages]);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex-1 space-y-3 overflow-auto">
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
            <div className="mt-1">
              {m.role === "assistant" ? (
                <MarkdownContent content={m.content} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="mr-8 rounded-lg bg-muted px-3 py-2 text-foreground">
            <span className="text-xs font-medium opacity-70">assistant</span>
            <div className="mt-2 flex gap-1">
              <span
                className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce"
                style={{ animationDelay: "0.15s" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-muted-foreground/70 animate-bounce"
                style={{ animationDelay: "0.3s" }}
              />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
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
