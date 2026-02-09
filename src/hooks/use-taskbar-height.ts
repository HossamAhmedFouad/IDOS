"use client";

import { useState, useEffect } from "react";
import { MOBILE_BREAKPOINT_PX } from "@/lib/constants/breakpoints";

const TASKBAR_HEIGHT_DESKTOP = 84;
const TASKBAR_HEIGHT_MOBILE = 64;

/**
 * Returns taskbar height in px: 56 on viewports narrower than mobile breakpoint, 84 otherwise.
 * Used for layout content area and taskbar container height.
 */
export function useTaskbarHeight(): number {
  const [height, setHeight] = useState(TASKBAR_HEIGHT_DESKTOP);

  useEffect(() => {
    const update = () => {
      setHeight(
        window.innerWidth < MOBILE_BREAKPOINT_PX
          ? TASKBAR_HEIGHT_MOBILE
          : TASKBAR_HEIGHT_DESKTOP
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return height;
}

/** Desktop taskbar height (for SSR/default and exports). */
export const TASKBAR_HEIGHT_PX = TASKBAR_HEIGHT_DESKTOP;
