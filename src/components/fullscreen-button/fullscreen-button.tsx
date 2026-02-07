"use client";

import { useState, useEffect, useCallback } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateFullscreenState = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    updateFullscreenState();
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, [updateFullscreenState]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignore if fullscreen not supported or denied
    }
  }, []);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleFullscreen}
      className="shrink-0 gap-2 text-muted-foreground hover:text-foreground"
      title={isFullscreen ? "Exit full screen" : "Full screen"}
      aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
    >
      {isFullscreen ? (
        <Minimize2 className="size-4" />
      ) : (
        <Maximize2 className="size-4" />
      )}
    </Button>
  );
}
