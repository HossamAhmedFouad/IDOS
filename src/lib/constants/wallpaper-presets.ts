import type { WallpaperId } from "@/store/use-personalization-store";

/** CSS background value for each wallpaper preset (gradients / patterns). */
export const WALLPAPER_PRESETS: Record<Exclude<WallpaperId, "custom">, string> = {
  aurora:
    "radial-gradient(ellipse 120% 80% at 50% 0%, oklch(0.35 0.15 265 / 0.5), transparent 50%), radial-gradient(ellipse 80% 50% at 80% 60%, oklch(0.4 0.12 200 / 0.35), transparent 45%), radial-gradient(ellipse 60% 40% at 20% 80%, oklch(0.45 0.1 300 / 0.3), transparent 40%), linear-gradient(180deg, oklch(0.12 0.02 265), oklch(0.08 0.015 265))",
  sunset:
    "radial-gradient(ellipse 100% 70% at 70% 30%, oklch(0.5 0.2 25 / 0.5), transparent 50%), radial-gradient(ellipse 80% 60% at 30% 70%, oklch(0.45 0.15 350 / 0.4), transparent 45%), linear-gradient(180deg, oklch(0.15 0.03 25), oklch(0.09 0.02 265))",
  midnight:
    "radial-gradient(ellipse 90% 60% at 50% 40%, oklch(0.2 0.08 260 / 0.6), transparent 55%), radial-gradient(ellipse 70% 50% at 20% 80%, oklch(0.18 0.06 250 / 0.4), transparent 50%), linear-gradient(180deg, oklch(0.06 0.02 260), oklch(0.04 0.01 260))",
  forest:
    "radial-gradient(ellipse 100% 80% at 50% 100%, oklch(0.25 0.08 145 / 0.4), transparent 50%), radial-gradient(ellipse 60% 40% at 80% 50%, oklch(0.2 0.06 160 / 0.3), transparent 45%), linear-gradient(0deg, oklch(0.1 0.03 145), oklch(0.07 0.02 265))",
  noise: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E") repeat, linear-gradient(180deg, oklch(0.1 0.02 265), oklch(0.07 0.015 265))`,
};

export const WALLPAPER_LABELS: Record<WallpaperId, string> = {
  aurora: "Aurora",
  sunset: "Sunset",
  midnight: "Midnight",
  forest: "Forest",
  noise: "Subtle noise",
  custom: "Custom image",
};
