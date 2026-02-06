"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const BOOT_LINES = [
  "[IDOS] Intent-Driven Operating System v1.0",
  "[IDOS] Initializing core services...",
  "[IDOS] Loading workspace engine...",
  "[IDOS] Mounting intent parser...",
  "[IDOS] Starting UI shell...",
  "[IDOS] Ready.",
];

const BOOT_DURATION_MS = 5200;
const LINE_INTERVAL_MS = 520;
const FADE_OUT_MS = 700;

export function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const lineInterval = setInterval(() => {
      setVisibleLines((n) => Math.min(n + 1, BOOT_LINES.length));
    }, LINE_INTERVAL_MS);

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, (elapsed / BOOT_DURATION_MS) * 100);
      setProgress(p);
    }, 50);

    const doneTimer = setTimeout(() => {
      clearInterval(lineInterval);
      clearInterval(progressInterval);
      setProgress(100);
      setVisibleLines(BOOT_LINES.length);
      setFadeOut(true);
    }, BOOT_DURATION_MS);

    return () => {
      clearInterval(lineInterval);
      clearInterval(progressInterval);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[oklch(0.04_0.02_265)] font-mono"
      initial={{ opacity: 1 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: FADE_OUT_MS / 1000, ease: "easeInOut" }}
      onAnimationComplete={() => fadeOut && onComplete()}
    >
      {/* Logo / title block */}
      <motion.div
        className="mb-12 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <span
          className="text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          style={{
            textShadow: "0 0 40px oklch(0.6 0.22 265 / 0.5)",
          }}
        >
          IDOS
        </span>
        <span className="text-sm text-[oklch(0.55_0.02_265)]">
          Intent-Driven Operating System
        </span>
      </motion.div>

      {/* Boot log lines */}
      <div className="mb-8 min-h-[7rem] w-full max-w-md px-6">
        {BOOT_LINES.slice(0, visibleLines).map((line) => (
          <motion.div
            key={line}
            className="text-left text-xs text-[oklch(0.65_0.02_265)]"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-[oklch(0.6_0.22_265)]">&gt;</span> {line}
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <motion.div
        className="h-1 w-64 overflow-hidden rounded-full bg-[oklch(0.12_0.02_265)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div
          className="h-full rounded-full bg-[oklch(0.6_0.22_265)]"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.15 }}
        />
      </motion.div>
    </motion.div>
  );
}
