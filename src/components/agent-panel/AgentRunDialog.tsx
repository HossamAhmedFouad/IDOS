"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "@/store/use-agent-store";
import { useAgentExecution } from "@/hooks/use-agent-execution";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AgentRunDialog() {
  const agentRunDialogOpen = useAgentStore((s) => s.agentRunDialogOpen);
  const closeAgentRunDialog = useAgentStore((s) => s.closeAgentRunDialog);
  const { executeIntent, isExecuting } = useAgentExecution();
  const [intent, setIntent] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = intent.trim();
      if (!text || isExecuting) return;
      executeIntent(text);
      closeAgentRunDialog();
      setIntent("");
    },
    [intent, isExecuting, executeIntent, closeAgentRunDialog]
  );

  useEffect(() => {
    if (!agentRunDialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAgentRunDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [agentRunDialogOpen, closeAgentRunDialog]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {agentRunDialogOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/60 backdrop-blur-sm"
          onClick={closeAgentRunDialog}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg rounded-xl border border-border bg-card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Run with agent
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Describe what you want the agent to do (e.g. &quot;Find all notes about meetings and add a task&quot;).
            </p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="What should the agent do?"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="flex-1"
                autoFocus
                disabled={isExecuting}
              />
              <Button type="submit" disabled={!intent.trim() || isExecuting}>
                {isExecuting ? "…" : "Run"}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Shortcut: Ctrl+K (Windows/Linux) or Cmd+K (Mac)
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
