"use client";

import type { LucideIcon } from "lucide-react";
import { useState, useCallback, useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, LayoutGrid, Sparkles } from "lucide-react";
import type { WorkspaceConfig } from "@/lib/types/workspace";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PLACEHOLDER_MESSAGES = [
  "Take notes and set a 25 min timer...",
  "Create a todo list for my project...",
  "Start a coding session with AI chat...",
  "Write a quick note and set a reminder...",
  "Open notes, timer, and todo together...",
  "I need to focus—notes and pomodoro timer...",
];

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
  /** When set, submit runs the agent with this intent instead of parse-intent (no workspace switch). */
  onAgentSubmit?: (intent: string) => void;
  /** When set, shows a mode dropdown (Workspace | Agent) in the input row. */
  modeSelect?: {
    value: "workspace" | "agent";
    onChange: (value: "workspace" | "agent") => void;
  };
  /** When true and onAgentSubmit is used, do not reset loading after submit (parent controls transition). */
  keepLoadingAfterAgentSubmit?: boolean;
  /** When set, overrides internal loading state (e.g. parent passes isExecuting so bar clears when agent completes). */
  loading?: boolean;
}

export interface IntentInputHandle {
  setIntent: (value: string) => void;
  focus: () => void;
}

export const IntentInput = forwardRef<IntentInputHandle, IntentInputProps>(function IntentInput({
  onSubmitting,
  onSuccess,
  submitLabel = "Go",
  submitIcon: SubmitIcon,
  onIntentChange,
  onAgentSubmit,
  modeSelect,
  keepLoadingAfterAgentSubmit = false,
  loading: loadingProp,
}, ref) {
  const [intent, setIntent] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = loadingProp !== undefined ? loadingProp : internalLoading;
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState("");
  const [isDeletingPlaceholder, setIsDeletingPlaceholder] = useState(false);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    setIntent(value: string) {
      setIntent((_) => value);
      setError(null);
    },
    focus() {
      inputRef.current?.focus();
    },
  }), []);

  useEffect(() => {
    if (intent.length > 0 || loading) return;

    const full = PLACEHOLDER_MESSAGES[placeholderIndex];
    const typeSpeed = 50;
    const deleteSpeed = 30;
    const pauseAfterType = 2500;
    const pauseBeforeDelete = 600;

    let delay: number;
    if (isDeletingPlaceholder) {
      delay = deleteSpeed;
    } else if (placeholderText.length === full.length) {
      delay = pauseAfterType;
    } else if (placeholderText.length === 0) {
      delay = pauseBeforeDelete;
    } else {
      delay = typeSpeed;
    }

    const t = setTimeout(() => {
      if (isDeletingPlaceholder) {
        if (placeholderText.length === 0) {
          setIsDeletingPlaceholder(false);
          setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_MESSAGES.length);
        } else {
          setPlaceholderText((prev) => prev.slice(0, -1));
        }
      } else {
        if (placeholderText.length === full.length) {
          setIsDeletingPlaceholder(true);
        } else {
          setPlaceholderText(full.slice(0, placeholderText.length + 1));
        }
      }
    }, delay);

    return () => clearTimeout(t);
  }, [intent.length, loading, placeholderIndex, placeholderText, isDeletingPlaceholder]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;
      const text = intent.trim();

      onSubmitting?.();
      setInternalLoading(true);
      setError(null);

      if (!text) {
        // No intent: if we have workspaces, go to workspace; else stay on home
        setTimeout(() => {
          if (workspaces.length > 0) {
            onSuccess?.();
          }
          setInternalLoading(false);
        }, 800);
        return;
      }

      if (onAgentSubmit) {
        onAgentSubmit(text);
        setIntent("");
        if (!keepLoadingAfterAgentSubmit) setInternalLoading(false);
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
        setInternalLoading(false);
      }
    },
    [intent, loading, createWorkspace, workspaces.length, onSubmitting, onSuccess, onAgentSubmit, keepLoadingAfterAgentSubmit]
  );

  const [modePopoverOpen, setModePopoverOpen] = useState(false);
  const modeLabel = modeSelect?.value === "agent" ? "Agent" : "Workspace";

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="relative flex w-full max-w-4xl gap-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="flex flex-1 items-center gap-3 rounded-xl border bg-card/80 p-3 shadow-lg backdrop-blur-md transition-[box-shadow,border-color]"
        animate={{
          scale: focused ? 1.02 : 1,
          boxShadow: focused
            ? "0 0 0 1px var(--ring), 0 20px 40px -12px rgba(0,0,0,0.4)"
            : "0 4px 6px -1px rgba(0,0,0,0.2), 0 2px 4px -2px rgba(0,0,0,0.1)",
          borderColor: focused ? "var(--ring)" : "var(--border)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {modeSelect && (
          <Popover open={modePopoverOpen} onOpenChange={setModePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="shrink-0 gap-2 rounded-lg shadow-sm hover:bg-primary/90"
                aria-label="Choose mode"
              >
                {modeSelect.value === "agent" ? (
                  <Sparkles className="size-4" />
                ) : (
                  <LayoutGrid className="size-4" />
                )}
                <span>{modeLabel}</span>
                <ChevronDown className="size-4 opacity-80" />
              </Button>
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent align="start" className="z-[100] w-48 p-2">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    modeSelect.onChange("workspace");
                    setModePopoverOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    modeSelect.value === "workspace"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent/60"
                  )}
                >
                  <LayoutGrid className="size-4 shrink-0" />
                  Workspace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    modeSelect.onChange("agent");
                    setModePopoverOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    modeSelect.value === "agent"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent/60"
                  )}
                >
                  <Sparkles className="size-4 shrink-0" />
                  Agent
                </button>
              </div>
            </PopoverContent>
            </PopoverPortal>
          </Popover>
        )}
        <div className="relative min-h-12 flex-1">
          <Input
            ref={inputRef}
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
            disabled={loading}
            className="min-h-12 w-full border-0 bg-transparent py-3 text-base shadow-none focus-visible:ring-0 md:text-lg"
          />
          {intent.length === 0 && !loading && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center px-3"
              aria-hidden
            >
              <span className="truncate text-base text-muted-foreground md:text-lg">
                {placeholderText}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="ml-0.5 inline-block h-4 w-0.5 -translate-y-px align-middle bg-muted-foreground"
                />
              </span>
            </div>
          )}
        </div>
        <Button
          type="submit"
          disabled={loading || !intent.trim()}
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
});
