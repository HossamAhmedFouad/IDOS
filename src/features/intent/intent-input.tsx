"use client";

import type { LucideIcon } from "lucide-react";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { WorkspaceConfig } from "@/lib/types/workspace";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface IntentInputProps {
  /** Called when submit starts (before API call or transition). */
  onSubmitting?: () => void;
  /** Called when submit succeeds or when starting with no intent (go to workspace). */
  onSuccess?: () => void;
  /** Label for the submit button (used when submitIcon is not set). */
  submitLabel?: string;
  /** Icon for the submit button (when set, renders icon instead of label). */
  submitIcon?: LucideIcon;
  /** Called when the intent input value changes. */
  onIntentChange?: (value: string) => void;
}

export function IntentInput({
  onSubmitting,
  onSuccess,
  submitLabel = "Go",
  submitIcon: SubmitIcon,
  onIntentChange,
}: IntentInputProps = {}) {
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;
      const text = intent.trim();

      onSubmitting?.();
      setLoading(true);
      setError(null);

      if (!text) {
        // No intent: if we have workspaces, go to workspace; else stay on home
        setTimeout(() => {
          if (workspaces.length > 0) {
            onSuccess?.();
          }
          setLoading(false);
        }, 800);
        return;
      }

      try {
        const res = await fetch("/api/parse-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: text }),
        });
        let data: { error?: string; workspace?: unknown } = {};
        try {
          data = await res.json();
        } catch {
          data = { error: "Invalid response from server" };
        }
        if (!res.ok) {
          const message =
            typeof data.error === "string"
              ? data.error
              : "Failed to parse intent";
          throw new Error(message);
        }
        const workspace = data.workspace;
        if (workspace && typeof workspace === "object" && "apps" in workspace) {
          createWorkspace(workspace as WorkspaceConfig, text);
        }
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [intent, loading, createWorkspace, workspaces.length, onSubmitting, onSuccess]
  );

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="relative flex w-full max-w-2xl gap-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex flex-1 gap-2 rounded-xl border bg-card/80 shadow-lg backdrop-blur-md transition-[box-shadow,border-color]"
        animate={{
          scale: focused ? 1.02 : 1,
          boxShadow: focused
            ? "0 0 0 1px var(--ring), 0 20px 40px -12px rgba(0,0,0,0.4)"
            : "0 4px 6px -1px rgba(0,0,0,0.2), 0 2px 4px -2px rgba(0,0,0,0.1)",
          borderColor: focused ? "var(--ring)" : "var(--border)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <Input
          type="text"
          value={intent}
          onChange={(e) => {
            const v = e.target.value;
            setIntent(v);
            if (error) setError(null);
            onIntentChange?.(v);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Describe what you want to do... (e.g. 'Take notes and set a 25 min timer')"
          disabled={loading}
          className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          disabled={loading}
          size={SubmitIcon ? "icon" : undefined}
          className={SubmitIcon ? "rounded-lg shrink-0" : "rounded-lg px-6 shrink-0"}
          aria-label={SubmitIcon ? (submitLabel ?? "Submit") : undefined}
        >
          {loading ? (
            "..."
          ) : SubmitIcon ? (
            <SubmitIcon className="size-5" />
          ) : (
            submitLabel
          )}
        </Button>
      </motion.div>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 right-0 top-full z-10 mt-2 max-h-32 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          <p className="whitespace-pre-wrap break-words">{error}</p>
        </motion.div>
      )}
    </motion.form>
  );
}
