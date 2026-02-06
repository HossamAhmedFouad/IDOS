"use client";

import { useEffect, useRef } from "react";
import type { ParticleShape as ParticleShapeType, ParticleSystem as ParticleSystemType } from "@/store/use-personalization-store";
import { usePersonalizationStore } from "@/store/use-personalization-store";
import { THEME_PRIMARY_RGB } from "@/lib/constants/theme-colors";
import type { ThemeId } from "@/store/use-personalization-store";

const MAX_PARTICLES = 200;
const BASE_PARTICLES = 15;
const INTENT_FACTOR = 8; // particles per character
const MIN_ORBIT_PARTICLES = 80;
const PARTICLE_RADIUS = 1.5;
const DRIFT_SPEED = 0.3;
const OPACITY = 0.4;
const ORBIT_RADIUS = 100;
const ORBIT_RADIUS_SPREAD = 15;
const ORBIT_ANGULAR_SPEED = 0.018;
const GATHER_LERP = 0.08;
const LINE_DISTANCE = 120;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  orbitAngle?: number;
  orbitRadius?: number;
}

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * DRIFT_SPEED,
    vy: (Math.random() - 0.5) * DRIFT_SPEED,
    radius: PARTICLE_RADIUS,
    opacity: 0.2 + Math.random() * OPACITY,
  };
}

const DEFAULT_RGB = THEME_PRIMARY_RGB.violet;
const COLOR_LERP = 0.06;

function lerpRgb(
  current: { r: number; g: number; b: number },
  target: { r: number; g: number; b: number },
  t: number
): void {
  current.r += (target.r - current.r) * t;
  current.g += (target.g - current.g) * t;
  current.b += (target.b - current.b) * t;
}

function rgbToRgba(rgb: { r: number; g: number; b: number }, alpha: number): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

export interface ParticleBackgroundProps {
  /** Intent input length; more typing = more particles (capped). */
  intentLength: number;
  /** When true, particles gather around the blob and orbit it. */
  loading?: boolean;
  /** Blob center in viewport coords (for orbit mode). */
  blobCenter?: { x: number; y: number } | null;
  /** Shape of each particle. */
  particleShape?: ParticleShapeType;
  /** Particle system variant. */
  particleSystem?: ParticleSystemType;
}

export function ParticleBackground({
  intentLength,
  loading = false,
  blobCenter = null,
  particleShape = "circle",
  particleSystem = "drifting",
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const blobCenterRef = useRef(blobCenter);
  const loadingRef = useRef(loading);
  const intentLengthRef = useRef(intentLength);
  const particleShapeRef = useRef(particleShape);
  const particleSystemRef = useRef(particleSystem);
  const themeId = usePersonalizationStore((s) => s.themeId);
  const themeIdRef = useRef<ThemeId>(themeId);
  const currentRgbRef = useRef<{ r: number; g: number; b: number }>({ ...THEME_PRIMARY_RGB[themeId] });
  blobCenterRef.current = blobCenter;
  loadingRef.current = loading;
  intentLengthRef.current = intentLength;
  particleShapeRef.current = particleShape;
  particleSystemRef.current = particleSystem;
  themeIdRef.current = themeId;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles = particlesRef.current;

    const resize = () => {
      const dpr = window.devicePixelRatio ?? 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    };

    const syncParticleCount = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const il = intentLengthRef.current;
      const ld = loadingRef.current;
      const bc = blobCenterRef.current;

      const driftTarget = Math.min(
        MAX_PARTICLES,
        BASE_PARTICLES + Math.floor(il * INTENT_FACTOR)
      );
      const targetCount = ld
        ? Math.max(MIN_ORBIT_PARTICLES, particles.length, driftTarget)
        : driftTarget;

      if (particles.length < targetCount) {
        while (particles.length < targetCount) {
          particles.push(createParticle(w, h));
        }
      } else if (!ld && particles.length > targetCount) {
        particles.length = targetCount;
      }

      if (ld && bc) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (p.orbitAngle === undefined) {
            const t = i / Math.max(1, particles.length);
            p.orbitAngle = t * Math.PI * 2;
            p.orbitRadius =
              ORBIT_RADIUS + (Math.random() - 0.5) * ORBIT_RADIUS_SPREAD;
          }
        }
      } else {
        for (const p of particles) {
          delete p.orbitAngle;
          delete p.orbitRadius;
        }
      }
    };

    const currentRgb = currentRgbRef.current;

    const drawParticle = (p: Particle) => {
      const shape = particleShapeRef.current;
      ctx.fillStyle = rgbToRgba(currentRgb, p.opacity);
      const r = p.radius;
      if (shape === "square") {
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const bc = blobCenterRef.current;
      const ld = loadingRef.current;
      const system = particleSystemRef.current;

      const targetRgb = THEME_PRIMARY_RGB[themeIdRef.current];
      lerpRgb(currentRgb, targetRgb, COLOR_LERP);

      syncParticleCount();
      ctx.clearRect(0, 0, w, h);

      if (ld && bc) {
        for (const p of particles) {
          if (
            p.orbitAngle !== undefined &&
            p.orbitRadius !== undefined
          ) {
            p.orbitAngle += ORBIT_ANGULAR_SPEED;
            const targetX =
              bc.x + p.orbitRadius * Math.cos(p.orbitAngle);
            const targetY =
              bc.y + p.orbitRadius * Math.sin(p.orbitAngle);
            p.x += (targetX - p.x) * GATHER_LERP;
            p.y += (targetY - p.y) * GATHER_LERP;
          }
          drawParticle(p);
        }
      } else {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          drawParticle(p);
        }
      }

      if (system === "lines") {
        const lineAlpha = 0.15;
        ctx.strokeStyle = rgbToRgba(currentRgb, lineAlpha);
        ctx.lineWidth = 1;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i];
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < LINE_DISTANCE) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    const handleResize = () => {
      resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [particleShape, particleSystem]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
      />
    </>
  );
}
