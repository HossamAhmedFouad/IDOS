"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  usePersonalizationStore,
  type ThemeId,
} from "@/store/use-personalization-store";
import { cn } from "@/lib/utils";
import { Palette, Circle, Square } from "lucide-react";

const THEMES: { id: ThemeId; label: string; className: string }[] = [
  { id: "violet", label: "Violet", className: "bg-[oklch(0.6_0.22_265)]" },
  { id: "blue", label: "Blue", className: "bg-[oklch(0.55_0.22_250)]" },
  { id: "green", label: "Green", className: "bg-[oklch(0.6_0.2_145)]" },
  { id: "rose", label: "Rose", className: "bg-[oklch(0.65_0.2_350)]" },
  { id: "amber", label: "Amber", className: "bg-[oklch(0.75_0.18_75)]" },
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
  const themeId = usePersonalizationStore((s) => s.themeId);
  const setThemeId = usePersonalizationStore((s) => s.setThemeId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            Personalization
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-2">
          {/* Background */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Background</h3>
            <div className="flex gap-2">
              {(["none", "particles"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={backgroundType === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBackgroundType(value)}
                >
                  {value === "none" ? "None" : "Particles"}
                </Button>
              ))}
            </div>
          </section>

          {/* Particle options (only when background is particles) */}
          {backgroundType === "particles" && (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Particle system
                </h3>
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
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Particle shape
                </h3>
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
              </section>
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
