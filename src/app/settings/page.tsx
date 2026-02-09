"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSettingsStore } from "@/store/use-settings-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

const GOOGLE_AI_STUDIO_URL = "https://aistudio.google.com/app/apikey";

export default function SettingsPage() {
  const geminiApiKey = useSettingsStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useSettingsStore((s) => s.setGeminiApiKey);
  const clearGeminiApiKey = useSettingsStore((s) => s.clearGeminiApiKey);

  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(geminiApiKey ?? "");
  }, [geminiApiKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(value.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setValue("");
    clearGeminiApiKey();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">IDOS Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your Gemini API key to use the agent.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="gemini-api-key"
              className="text-sm font-medium text-foreground"
            >
              Gemini API key
            </label>
            <Input
              id="gemini-api-key"
              type="password"
              placeholder="Enter your API key"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="font-mono text-sm"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Get a key from{" "}
              <a
                href={GOOGLE_AI_STUDIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                Google AI Studio
              </a>
              . Your key is stored only on this device and is sent to our server
              only when running the agent.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saved}>
              {saved ? "Saved" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={!value && !geminiApiKey}
            >
              Clear
            </Button>
          </div>
        </form>

        <div className="pt-4 border-t border-border">
          <Link href="/">
            <Button variant="ghost" className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="size-4" />
              Back to IDOS
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
