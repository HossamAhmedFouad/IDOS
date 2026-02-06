"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BackgroundType = "none" | "particles" | "geometric" | "wallpaper";
export type ParticleSystem = "drifting" | "lines";
export type ParticleShape = "circle" | "square";
export type GeometricShape = "mesh" | "grid" | "hexagons" | "dots";
export type WallpaperId =
  | "aurora"
  | "sunset"
  | "midnight"
  | "forest"
  | "noise"
  | "custom";
export type ThemeId = "violet" | "blue" | "green" | "rose" | "amber";

interface PersonalizationState {
  backgroundType: BackgroundType;
  particleSystem: ParticleSystem;
  particleShape: ParticleShape;
  geometricShape: GeometricShape;
  wallpaperId: WallpaperId;
  /** Used when wallpaperId === "custom" — URL to image. */
  wallpaperCustomUrl: string;
  themeId: ThemeId;
  personalizationPanelOpen: boolean;

  setBackgroundType: (v: BackgroundType) => void;
  setParticleSystem: (v: ParticleSystem) => void;
  setParticleShape: (v: ParticleShape) => void;
  setGeometricShape: (v: GeometricShape) => void;
  setWallpaperId: (v: WallpaperId) => void;
  setWallpaperCustomUrl: (v: string) => void;
  setThemeId: (v: ThemeId) => void;
  setPersonalizationPanelOpen: (v: boolean) => void;
}

export const usePersonalizationStore = create<PersonalizationState>()(
  persist(
    (set) => ({
      backgroundType: "particles",
      particleSystem: "drifting",
      particleShape: "circle",
      geometricShape: "mesh",
      wallpaperId: "aurora",
      wallpaperCustomUrl: "",
      themeId: "violet",
      personalizationPanelOpen: false,

      setBackgroundType: (v) => set({ backgroundType: v }),
      setParticleSystem: (v) => set({ particleSystem: v }),
      setParticleShape: (v) => set({ particleShape: v }),
      setGeometricShape: (v) => set({ geometricShape: v }),
      setWallpaperId: (v) => set({ wallpaperId: v }),
      setWallpaperCustomUrl: (v) => set({ wallpaperCustomUrl: v }),
      setThemeId: (v) => set({ themeId: v }),
      setPersonalizationPanelOpen: (v) => set({ personalizationPanelOpen: v }),
    }),
    { name: "idos-personalization" }
  )
);
