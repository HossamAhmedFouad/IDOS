/** Breakpoint width in px below which we treat the viewport as mobile (align with Tailwind sm: 640px). */
export const MOBILE_BREAKPOINT_PX = 640;

export function isMobileViewport(width: number): boolean {
  return width < MOBILE_BREAKPOINT_PX;
}
