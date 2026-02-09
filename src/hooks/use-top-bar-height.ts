"use client";

import { useState, useEffect } from "react";
import { MOBILE_BREAKPOINT_PX } from "@/lib/constants/breakpoints";

const TOP_BAR_HEIGHT_DESKTOP = 48;
/** Taller on mobile so app title bar (close button) sits below the nav and isn’t hidden. */
const TOP_BAR_HEIGHT_MOBILE = 56;

/**
 * Returns top bar height in px. Larger on narrow viewports so the app content area
 * starts lower and the nav doesn’t cover the app window close button.
 */
export function useTopBarHeight(): number {
  const [height, setHeight] = useState(TOP_BAR_HEIGHT_DESKTOP);

  useEffect(() => {
    const update = () => {
      setHeight(
        window.innerWidth < MOBILE_BREAKPOINT_PX
          ? TOP_BAR_HEIGHT_MOBILE
          : TOP_BAR_HEIGHT_DESKTOP
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return height;
}

export const TOP_BAR_HEIGHT_PX = TOP_BAR_HEIGHT_DESKTOP;
