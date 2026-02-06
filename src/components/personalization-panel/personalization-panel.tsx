"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  usePersonalizationStore,
  type ThemeId,
  type BackgroundType,
  type GeometricShape,
  type WallpaperId,
} from "@/store/use-personalization-store";
import { WALLPAPER_LABELS } from "@/lib/constants/wallpaper-presets";
import { cn } from "@/lib/utils";
import {
  Palette,
  Circle,
  Square,
  LayoutGrid,
  Hexagon,
  GripHorizontal,
  ImageIcon,
  Mountain,
  Sunset,
  Moon,
  Trees,
  Sparkles,
} from "lucide-react";

const THEMES: { id: ThemeId; label: string; className: string }[] = [
  { id: "violet", label: "Violet", className: "bg-[oklch(0.6_0.22_265)]" },
  { id: "blue", label: "Blue", className: "bg-[oklch(0.55_0.22_250)]" },
  { id: "green", label: "Green", className: "bg-[oklch(0.6_0.2_145)]" },
  { id: "rose", label: "Rose", className: "bg-[oklch(0.65_0.2_350)]" },
  { id: "amber", label: "Amber", className: "bg-[oklch(0.75_0.18_75)]" },
];

/** Extra layer behind particles. Particles are always visible. */
const BACKGROUND_OPTIONS: { value: BackgroundType; label: string; icon: React.ReactNode }[] = [
  { value: "none", label: "None", icon: <div className="size-4 rounded-sm bg-muted" /> },
  { value: "geometric", label: "Geometric", icon: <LayoutGrid className="size-4" /> },
  { value: "wallpaper", label: "Wallpaper", icon: <ImageIcon className="size-4" /> },
];

const GEOMETRIC_OPTIONS: { value: GeometricShape; label: string; icon: React.ReactNode }[] = [
  { value: "mesh", label: "Mesh", icon: <GripHorizontal className="size-4" /> },
  { value: "grid", label: "Grid", icon: <LayoutGrid className="size-4" /> },
  { value: "hexagons", label: "Hexagons", icon: <Hexagon className="size-4" /> },
  { value: "dots", label: "Dots", icon: <Circle className="size-3" /> },
];

const WALLPAPER_OPTIONS: { id: Exclude<WallpaperId, "custom">; label: string; icon: React.ReactNode }[] = [
  { id: "aurora", label: WALLPAPER_LABELS.aurora, icon: <Sparkles className="size-4" /> },
  { id: "sunset", label: WALLPAPER_LABELS.sunset, icon: <Sunset className="size-4" /> },
  { id: "midnight", label: WALLPAPER_LABELS.midnight, icon: <Moon className="size-4" /> },
  { id: "forest", label: WALLPAPER_LABELS.forest, icon: <Trees className="size-4" /> },
  { id: "noise", label: WALLPAPER_LABELS.noise, icon: <Mountain className="size-4" /> },
];

export function PersonalizationPanel() {
  const open = usePersonalizationStore((s) => s.personalizationPanelOpen);
  const setOpen = usePersonalizationStore((s) => s.setPersonalizationPanelOpen);
  const backgroundType = usePersonalizationStore((s) => s.backgroundType);
  const setBackgroundType = usePersonalizationStore((s) => s.setBackgroundType);
  const particleSystem = usePersonalizationStore((s) => s.particleSystem);
  const setParticleSystem = usePersonalizationStore((s) => s.setParticleSystem);
  const particleShape = usePersonalizationStore((s) => s.particleShape);
  const setParticleShape = usePersonalizationStore((s) => s.setParticleShape);
  const geometricShape = usePersonalizationStore((s) => s.geometricShape);
  const setGeometricShape = usePersonalizationStore((s) => s.setGeometricShape);
  const wallpaperId = usePersonalizationStore((s) => s.wallpaperId);
  const setWallpaperId = usePersonalizationStore((s) => s.setWallpaperId);
  const wallpaperCustomUrl = usePersonalizationStore((s) => s.wallpaperCustomUrl);
  const setWallpaperCustomUrl = usePersonalizationStore((s) => s.setWallpaperCustomUrl);
  const themeId = usePersonalizationStore((s) => s.themeId);
  const setThemeId = usePersonalizationStore((s) => s.setThemeId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            Personalization
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-2">
          {/* Extra background layer (particles are always on) */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Background layer</h3>
            <p className="text-xs text-muted-foreground">
              Particles are always visible. Choose an extra layer behind them.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUND_OPTIONS.map(({ value, label, icon }) => {
                const isSelected =
                  value === backgroundType || (value === "none" && backgroundType === "particles");
                return (
                  <Button
                    key={value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBackgroundType(value)}
                    className="gap-1.5"
                  >
                    {icon}
                    {label}
                  </Button>
                );
              })}
            </div>
          </section>

          {/* Particles (always on) — style options */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Particles</h3>
            <p className="text-xs text-muted-foreground">
              Always visible; customize style below.
            </p>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground block mb-1.5">System</span>
                <div className="flex gap-2">
                  {(["drifting", "lines"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={particleSystem === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setParticleSystem(value)}
                    >
                      {value === "drifting" ? "Drifting dots" : "Connecting lines"}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1.5">Shape</span>
                <div className="flex gap-2">
                  {(["circle", "square"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={particleShape === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setParticleShape(value)}
                      className="gap-1.5"
                    >
                      {value === "circle" ? (
                        <Circle className="size-4" />
                      ) : (
                        <Square className="size-4" />
                      )}
                      {value === "circle" ? "Circles" : "Squares"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Geometric shape (only when background is geometric) */}
          {backgroundType === "geometric" && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                Geometric shape
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GEOMETRIC_OPTIONS.map(({ value, label, icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={geometricShape === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGeometricShape(value)}
                    className="gap-1.5"
                  >
                    {icon}
                    {label}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {/* Wallpaper design (only when background is wallpaper) */}
          {backgroundType === "wallpaper" && (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Wallpaper design
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WALLPAPER_OPTIONS.map(({ id, label, icon }) => (
                    <Button
                      key={id}
                      type="button"
                      variant={wallpaperId === id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setWallpaperId(id)}
                      className="gap-1.5"
                    >
                      {icon}
                      {label}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={wallpaperId === "custom" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWallpaperId("custom")}
                    className="gap-1.5 col-span-2 sm:col-span-1"
                  >
                    <ImageIcon className="size-4" />
                    Custom
                  </Button>
                </div>
              </section>
              {wallpaperId === "custom" && (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">
                    Custom image URL
                  </h3>
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={wallpaperCustomUrl}
                    onChange={(e) => setWallpaperCustomUrl(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a direct link to an image. It will be used as your wallpaper.
                  </p>
                </section>
              )}
            </>
          )}

          {/* OS theme color */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">
              OS theme color
            </h3>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeId(t.id)}
                  className={cn(
                    "flex h-9 w-9 rounded-full border-2 transition-transform hover:scale-110",
                    t.className,
                    themeId === t.id
                      ? "border-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "border-transparent"
                  )}
                  title={t.label}
                  aria-label={`Theme: ${t.label}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {THEMES.find((t) => t.id === themeId)?.label ?? "Violet"} selected
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
