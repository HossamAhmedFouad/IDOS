"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, X } from "lucide-react";
import { useAgentStore } from "@/store/use-agent-store";
import { useAgentExecution } from "@/hooks/use-agent-execution";
import { readFile } from "@/lib/file-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AttachmentFilePickerDialog } from "@/components/file-picker";

const MAX_ATTACHED_FILES = 5;
const MAX_FILE_CONTENT_LENGTH = 8000;

export function AgentRunDialog() {
  const agentRunDialogOpen = useAgentStore((s) => s.agentRunDialogOpen);
  const closeAgentRunDialog = useAgentStore((s) => s.closeAgentRunDialog);
  const { executeIntent, isExecuting } = useAgentExecution();
  const [intent, setIntent] = useState("");
  const [attachedPaths, setAttachedPaths] = useState<string[]>([]);
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = intent.trim();
      if (!text || isExecuting) return;
      let attachedFiles: { path: string; content: string }[] | undefined;
      if (attachedPaths.length > 0) {
        const results = await Promise.allSettled(
          attachedPaths.slice(0, MAX_ATTACHED_FILES).map(async (path) => {
            const content = await readFile(path);
            return {
              path,
              content:
                content.length > MAX_FILE_CONTENT_LENGTH
                  ? content.slice(0, MAX_FILE_CONTENT_LENGTH) + "\n...[truncated]"
                  : content,
            };
          })
        );
        attachedFiles = results
          .filter(
            (r): r is PromiseFulfilledResult<{ path: string; content: string }> =>
              r.status === "fulfilled"
          )
          .map((r) => r.value);
      }
      executeIntent(text, attachedFiles?.length ? { attachedFiles } : undefined);
      closeAgentRunDialog();
      setIntent("");
      setAttachedPaths([]);
    },
    [intent, attachedPaths, isExecuting, executeIntent, closeAgentRunDialog]
  );

  useEffect(() => {
    if (!agentRunDialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAgentRunDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [agentRunDialogOpen, closeAgentRunDialog]);

  useEffect(() => {
    if (!agentRunDialogOpen) {
      setAttachedPaths([]);
      setAttachmentPickerOpen(false);
    }
  }, [agentRunDialogOpen]);

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
            {attachedPaths.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-2 py-1.5">
                {attachedPaths.slice(0, MAX_ATTACHED_FILES).map((path) => (
                  <span
                    key={path}
                    className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 text-xs text-foreground shadow-sm"
                  >
                    {path.split("/").pop() ?? path}
                    <button
                      type="button"
                      onClick={() =>
                        setAttachedPaths((prev) => prev.filter((p) => p !== path))
                      }
                      className="rounded hover:bg-destructive/20 p-0.5"
                      aria-label="Remove attachment"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setAttachmentPickerOpen(true)}
                  disabled={isExecuting || attachedPaths.length >= MAX_ATTACHED_FILES}
                  aria-label="Attach files"
                  title="Attach files from IDOS storage"
                >
                  <Paperclip className="size-4" />
                </Button>
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
              </div>
            </form>
            <AttachmentFilePickerDialog
              open={attachmentPickerOpen}
              onOpenChange={setAttachmentPickerOpen}
              onSelect={(paths) => setAttachedPaths(paths)}
              existingPaths={attachedPaths}
              initialPath="/"
            />
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
