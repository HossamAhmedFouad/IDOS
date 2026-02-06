"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { IntentInput } from "@/features/intent/intent-input";

export function HomeView() {
  const setView = useWorkspaceStore((s) => s.setView);
  const [loading, setLoading] = useState(false);

  const handleSuccess = () => {
    setView("workspace");
    setLoading(false);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Chat / intent area centered */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div className="pointer-events-auto w-full max-w-2xl px-4">
          <IntentInput
            submitLabel="Start"
            onSubmitting={() => setLoading(true)}
            onSuccess={handleSuccess}
          />
        </div>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm"
          >
            <motion.div
              className="size-16 rounded-2xl border-2 border-primary bg-primary/20"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.p
              className="text-sm font-medium text-muted-foreground"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Starting your workspace...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
