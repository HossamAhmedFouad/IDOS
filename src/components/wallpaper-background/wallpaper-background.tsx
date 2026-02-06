"use client";

import { usePersonalizationStore } from "@/store/use-personalization-store";
import { WALLPAPER_PRESETS } from "@/lib/constants/wallpaper-presets";

export function WallpaperBackground() {
  const wallpaperId = usePersonalizationStore((s) => s.wallpaperId);
  const wallpaperCustomUrl = usePersonalizationStore((s) => s.wallpaperCustomUrl);

  const isCustom = wallpaperId === "custom";
  const presetStyle =
    !isCustom && WALLPAPER_PRESETS[wallpaperId]
      ? { background: WALLPAPER_PRESETS[wallpaperId] }
      : undefined;

  if (isCustom && wallpaperCustomUrl) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${wallpaperCustomUrl})`,
        }}
        aria-hidden
      />
    );
  }

  if (isCustom) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={presetStyle}
      aria-hidden
    />
  );
}
