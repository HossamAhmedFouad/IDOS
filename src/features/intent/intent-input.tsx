"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface IntentInputProps {
  /** Called when submit starts (before API call or transition). */
  onSubmitting?: () => void;
  /** Called when submit succeeds or when starting with no intent (go to workspace). */
  onSuccess?: () => void;
  /** Label for the submit button. */
  submitLabel?: string;
}

export function IntentInput({
  onSubmitting,
  onSuccess,
  submitLabel = "Go",
}: IntentInputProps = {}) {
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const pushHistory = useWorkspaceStore((s) => s.pushHistory);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;
      const text = intent.trim();

      onSubmitting?.();
      setLoading(true);
      setError(null);

      if (!text) {
        // No intent: brief delay then transition to workspace
        setTimeout(() => {
          onSuccess?.();
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
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to parse intent");
        }
        const workspace = data.workspace;
        if (workspace) {
          setWorkspace(workspace);
          pushHistory(workspace);
        }
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [intent, loading, setWorkspace, pushHistory, onSubmitting, onSuccess]
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
          onChange={(e) => setIntent(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Describe what you want to do... (e.g. 'Take notes and set a 25 min timer')"
          disabled={loading}
          className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          disabled={loading}
          className="rounded-lg px-6 shrink-0"
        >
          {loading ? "..." : submitLabel}
        </Button>
      </motion.div>
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 right-0 top-full mt-2 text-sm text-destructive"
        >
          {error}
        </motion.span>
      )}
    </motion.form>
  );
}
