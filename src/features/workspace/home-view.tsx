"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Play } from "lucide-react";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { IntentInput } from "@/features/intent/intent-input";
import { IntentBlob } from "@/components/intent-blob";
import { ParticleBackground } from "@/components/particle-background";
import { GeometricField } from "@/components/geometric-field";
import { WallpaperBackground } from "@/components/wallpaper-background";
import { Taskbar, TASKBAR_HEIGHT_PX } from "@/components/taskbar";
import { Button } from "@/components/ui/button";

const INTENSITY_THRESHOLD = 12;

const LOADING_MESSAGES = [
  "Working on something great...",
  "Almost there...",
  "Preparing your workspace...",
  "Putting things together...",
  "Just a moment...",
  "Almost ready...",
  "Setting things up...",
  "Hang tight...",
  "Crafting your experience...",
  "Getting everything ready...",
];

export function HomeView() {
  const setView = useWorkspaceStore((s) => s.setView);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const backgroundType = usePersonalizationStore((s) => s.backgroundType);
  const particleSystem = usePersonalizationStore((s) => s.particleSystem);
  const particleShape = usePersonalizationStore((s) => s.particleShape);
  const [loading, setLoading] = useState(false);
  const [intentLength, setIntentLength] = useState(0);
  const [blobCenter, setBlobCenter] = useState<{ x: number; y: number } | null>(
    null
  );
  const intentContainerRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);

  const handleSuccess = () => {
    setView("workspace");
    setLoading(false);
  };

  const intensity = loading ? 1 : Math.min(1, intentLength / INTENSITY_THRESHOLD);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3800);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!loading) return;

    const updateBlobCenter = () => {
      const el = blobRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setBlobCenter({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    };

    updateBlobCenter();
    const raf = requestAnimationFrame(updateBlobCenter);
    const el = intentContainerRef.current;
    const ro = new ResizeObserver(updateBlobCenter);
    if (el) ro.observe(el);
    window.addEventListener("resize", updateBlobCenter);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", updateBlobCenter);
    };
  }, [loading]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Wallpaper (can coexist with particles) */}
      {backgroundType === "wallpaper" && <WallpaperBackground />}
      {/* Geometric field (mesh / grid / hexagons / dots) */}
      {backgroundType === "geometric" && <GeometricField />}
      {/* Particles always on */}
      <ParticleBackground
        intentLength={intentLength}
        loading={loading}
        blobCenter={blobCenter}
        particleSystem={particleSystem}
        particleShape={particleShape}
      />

      {/* Top bar: Workspace button */}
      <div className="absolute left-0 right-0 top-0 z-40 flex items-center justify-between gap-4 border-b border-border/80 bg-background/80 px-4 py-2 backdrop-blur-md">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (workspaces.length === 0) return;
            setView("workspace");
            if (activeWorkspaceId === null && workspaces[0]) {
              setActiveWorkspace(workspaces[0].id);
            }
          }}
          disabled={workspaces.length === 0}
          className="gap-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
          title={
            workspaces.length === 0
              ? "Create an intent to add a workspace"
              : "Switch to workspace"
          }
        >
          <LayoutGrid className="size-4" />
          Workspace
        </Button>
      </div>

      {/* Chat / intent area centered, above taskbar */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-center"
        style={{ bottom: TASKBAR_HEIGHT_PX }}
      >
        <div
          ref={intentContainerRef}
          className="pointer-events-auto relative w-full max-w-4xl px-4"
        >
          <IntentBlob
            ref={blobRef}
            intensity={intensity}
            loading={loading}
          />
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading-messages"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center gap-4 pt-16"
              >
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingMessageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-base font-bold text-foreground"
                  >
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="intent-input"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex w-full flex-col items-center gap-6"
              >
                <motion.p
                  className="text-5xl font-bold text-foreground md:text-6xl [font-family:var(--font-pixel)]"
                  animate={{ opacity: intentLength > 0 ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                  aria-hidden={intentLength > 0}
                >
                  IDOS
                </motion.p>
                <div className="w-full">
                  <IntentInput
                    submitIcon={Play}
                    submitLabel="Start"
                    onIntentChange={(v) => setIntentLength(v.length)}
                    onSubmitting={() => setLoading(true)}
                    onSuccess={handleSuccess}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Taskbar on home too */}
      <Taskbar />
    </div>
  );
}
