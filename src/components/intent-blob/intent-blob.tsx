"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { getPrimaryOklchWithAlpha } from "@/lib/constants/theme-colors";

const COLOR_TRANSITION = "0.5s ease";

export interface IntentBlobProps {
  /** Glow intensity from 0 (idle) to 1 (full glow). */
  intensity: number;
  /** When true, sphere shrinks slightly (loading state). */
  loading?: boolean;
}

export const IntentBlob = forwardRef<HTMLDivElement, IntentBlobProps>(
  function IntentBlob({ intensity, loading = false }, ref) {
    const themeId = usePersonalizationStore((s) => s.themeId);
    const scale = loading ? 0.82 : 0.9 + intensity * 0.3;
    const glowAlpha = 0.2 + intensity * 0.6;
    const innerHigh = 0.4 + intensity * 0.5;
    const innerLow = 0.1 + intensity * 0.3;
    const primaryGlow = getPrimaryOklchWithAlpha(themeId, glowAlpha);
    const primaryInnerHigh = getPrimaryOklchWithAlpha(themeId, innerHigh);
    const primaryInnerLow = getPrimaryOklchWithAlpha(themeId, innerLow);

    return (
      <motion.div
        ref={ref}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+80px)]"
        style={{
          width: 160,
          height: 160,
          filter: `blur(${20 + intensity * 30}px) drop-shadow(0 0 ${20 + intensity * 40}px ${primaryGlow})`,
          transition: `filter ${COLOR_TRANSITION}`,
        }}
        animate={{
          opacity: 0.3 + intensity * 0.5,
          scale,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 40%, ${primaryInnerHigh}, ${primaryInnerLow})`,
            transition: `background ${COLOR_TRANSITION}`,
          }}
        />
      </motion.div>
    );
  }
);
