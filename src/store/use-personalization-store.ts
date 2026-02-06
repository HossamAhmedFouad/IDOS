"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BackgroundType = "none" | "particles";
export type ParticleSystem = "drifting" | "lines";
export type ParticleShape = "circle" | "square";
export type ThemeId = "violet" | "blue" | "green" | "rose" | "amber";

interface PersonalizationState {
  backgroundType: BackgroundType;
  particleSystem: ParticleSystem;
  particleShape: ParticleShape;
  themeId: ThemeId;
  personalizationPanelOpen: boolean;

  setBackgroundType: (v: BackgroundType) => void;
  setParticleSystem: (v: ParticleSystem) => void;
  setParticleShape: (v: ParticleShape) => void;
  setThemeId: (v: ThemeId) => void;
  setPersonalizationPanelOpen: (v: boolean) => void;
}

export const usePersonalizationStore = create<PersonalizationState>()(
  persist(
    (set) => ({
      backgroundType: "particles",
      particleSystem: "drifting",
      particleShape: "circle",
      themeId: "violet",
      personalizationPanelOpen: false,

      setBackgroundType: (v) => set({ backgroundType: v }),
      setParticleSystem: (v) => set({ particleSystem: v }),
      setParticleShape: (v) => set({ particleShape: v }),
      setThemeId: (v) => set({ themeId: v }),
      setPersonalizationPanelOpen: (v) => set({ personalizationPanelOpen: v }),
    }),
    { name: "idos-personalization" }
  )
);
