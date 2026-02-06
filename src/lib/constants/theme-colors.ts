import type { ThemeId } from "@/store/use-personalization-store";

/** Primary color in oklch(L C H) for each theme — used for blob glow and gradients. */
export const THEME_PRIMARY_OKLCH: Record<ThemeId, string> = {
  violet: "0.6 0.22 265",
  blue: "0.55 0.22 250",
  green: "0.6 0.2 145",
  rose: "0.65 0.2 350",
  amber: "0.75 0.18 75",
};

/** Primary color as RGB for canvas/particles — matches THEME_PRIMARY_OKLCH. */
export const THEME_PRIMARY_RGB: Record<ThemeId, { r: number; g: number; b: number }> = {
  violet: { r: 124, g: 118, b: 255 },
  blue: { r: 99, g: 125, b: 255 },
  green: { r: 82, g: 196, b: 138 },
  rose: { r: 244, g: 114, b: 182 },
  amber: { r: 251, g: 191, b: 36 },
};

export function getPrimaryOklchWithAlpha(themeId: ThemeId, alpha: number): string {
  return `oklch(${THEME_PRIMARY_OKLCH[themeId]} / ${alpha})`;
}
