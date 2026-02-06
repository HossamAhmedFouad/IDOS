"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";

export interface IntentBlobProps {
  /** Glow intensity from 0 (idle) to 1 (full glow). */
  intensity: number;
  /** When true, sphere shrinks slightly (loading state). */
  loading?: boolean;
}

export const IntentBlob = forwardRef<HTMLDivElement, IntentBlobProps>(
  function IntentBlob({ intensity, loading = false }, ref) {
    const scale = loading ? 0.82 : 0.9 + intensity * 0.3;
    return (
      <motion.div
        ref={ref}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+80px)]"
        style={{ width: 160, height: 160 }}
        animate={{
          opacity: 0.3 + intensity * 0.5,
          scale,
          filter: `blur(${20 + intensity * 30}px) drop-shadow(0 0 ${20 + intensity * 40}px oklch(0.55 0.22 265 / ${0.2 + intensity * 0.6}))`,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 40%, oklch(0.55 0.22 265 / ${0.4 + intensity * 0.5}), oklch(0.55 0.22 265 / ${0.1 + intensity * 0.3}))`,
        }}
      />
    </motion.div>
  );
  }
);
