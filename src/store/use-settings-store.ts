"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  geminiApiKey: string;
  setGeminiApiKey: (value: string) => void;
  clearGeminiApiKey: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      geminiApiKey: "",
      setGeminiApiKey: (value) => set({ geminiApiKey: value ?? "" }),
      clearGeminiApiKey: () => set({ geminiApiKey: "" }),
    }),
    { name: "idos-settings" }
  )
);
