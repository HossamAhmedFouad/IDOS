"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const IDOS_VERSION = "0.1.0";

type AboutModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-md overflow-hidden border-border/80 bg-card p-0 shadow-2xl",
          "sm:rounded-2xl"
        )}
        aria-describedby="about-description"
      >
        <div className="relative">
          {/* Header with gradient accent */}
          <div className="relative border-b border-border/60 bg-muted/30 px-6 pt-6 pb-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-80" />
            <DialogHeader className="space-y-4 text-left">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner ring-1 ring-primary/20"
                >
                  <Sparkles className="h-6 w-6" />
                </motion.div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                    IDOS
                  </DialogTitle>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-primary/90">
                    Intent-Driven OS
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <DialogDescription
              id="about-description"
              className="text-sm leading-relaxed text-muted-foreground"
            >
              An operating system experience driven by your intent, built for the web.
              Run apps, manage tasks, and interact through natural language—all in one
              cohesive workspace.
            </DialogDescription>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span>Version</span>
              <span className="font-mono font-medium tabular-nums text-foreground/80">
                {IDOS_VERSION}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-border/60 bg-muted/20 px-6 py-4">
            <Button
              variant="default"
              size="sm"
              className="min-w-[88px]"
              onClick={() => onOpenChange(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
