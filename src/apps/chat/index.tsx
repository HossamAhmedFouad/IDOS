"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_PATH = "/chat/messages.json";

interface Message {
  id: string;
  text: string;
  sender: "user" | "other";
  timestamp: number;
}

function loadMessagesFromJson(json: string): Message[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function ChatApp({ config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const text = await readFile(filePath);
      setMessages(loadMessagesFromJson(text));
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const saveMessages = useCallback(
    async (newMessages: Message[]) => {
      setSaving(true);
      try {
        await writeFile(filePath, JSON.stringify(newMessages, null, 2));
      } finally {
        setSaving(false);
      }
    },
    [filePath]
  );

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const msg: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: "user",
      timestamp: Date.now(),
    };
    const newMessages = [...messages, msg];
    setMessages(newMessages);
    saveMessages(newMessages);
    setInput("");
  }, [input, messages, saveMessages]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {saving && (
        <div className="shrink-0 px-3 py-1 text-xs text-muted-foreground">
          Saving...
        </div>
      )}
      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-3 overflow-auto p-4"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="button" onClick={sendMessage}>
          Send
        </Button>
      </div>
    </div>
  );
}
