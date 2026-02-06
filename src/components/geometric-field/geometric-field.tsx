"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  usePersonalizationStore,
  type GeometricShape as GeometricShapeType,
} from "@/store/use-personalization-store";
import { THEME_PRIMARY_RGB } from "@/lib/constants/theme-colors";

const NUM_POINTS = 100;
const MIN_EDGE_DISTANCE = 45;
const MAX_EDGES_PER_POINT = 4;
const INFLUENCE_RADIUS = 200;
const MAX_DISPLACEMENT = 12;
const OPACITY = 0.16;
const LERP = 0.07;
const FLOAT_AMPLITUDE_MIN = 2;
const FLOAT_AMPLITUDE_MAX = 6;
const FLOAT_SPEED_MIN = 0.0004;
const FLOAT_SPEED_MAX = 0.001;
const PADDING = 40;
const GRID_SPACING = 42;
const HEX_RADIUS = 28;
const DOTS_SPACING = 36;

interface Point {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  floatPhase: number;
  floatAmp: number;
  floatSpeed: number;
}

function randomIn(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function dist(a: Point, b: Point): number {
  const dx = a.baseX - b.baseX;
  const dy = a.baseY - b.baseY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getRandomMeshPoints(width: number, height: number): Point[] {
  const points: Point[] = [];
  const w = width - PADDING * 2;
  const h = height - PADDING * 2;

  for (let i = 0; i < NUM_POINTS; i++) {
    const baseX = PADDING + Math.random() * w;
    const baseY = PADDING + Math.random() * h;
    points.push({
      baseX,
      baseY,
      x: baseX,
      y: baseY,
      dx: 0,
      dy: 0,
      floatPhase: Math.random() * Math.PI * 2,
      floatAmp: randomIn(FLOAT_AMPLITUDE_MIN, FLOAT_AMPLITUDE_MAX),
      floatSpeed: randomIn(FLOAT_SPEED_MIN, FLOAT_SPEED_MAX),
    });
  }
  return points;
}

/** Build edges: each point connects to up to MAX_EDGES_PER_POINT nearest neighbors within MIN_EDGE_DISTANCE. */
function getEdges(points: Point[]): [number, number][] {
  const edges = new Set<string>();

  for (let i = 0; i < points.length; i++) {
    const neighbors: { j: number; d: number }[] = [];
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const d = dist(points[i], points[j]);
      if (d <= MIN_EDGE_DISTANCE) neighbors.push({ j, d });
    }
    neighbors.sort((a, b) => a.d - b.d);
    let added = 0;
    for (const { j } of neighbors) {
      if (added >= MAX_EDGES_PER_POINT) break;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edges.has(key)) {
        edges.add(key);
        added++;
      }
    }
  }

  return Array.from(edges).map((key) => {
    const [a, b] = key.split("-").map(Number);
    return [a, b] as [number, number];
  });
}

/** Draw a single hexagon centered at (cx, cy) with radius r. */
function drawHexagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

export function GeometricField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const edgesRef = useRef<[number, number][]>([]);
  const mouseRef = useRef({ x: -1e6, y: -1e6 });
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const themeId = usePersonalizationStore((s) => s.themeId);
  const geometricShape = usePersonalizationStore((s) => s.geometricShape);
  const strokeRef = useRef("");
  const shapeRef = useRef<GeometricShapeType>(geometricShape);

  const rgb = THEME_PRIMARY_RGB[themeId];
  strokeRef.current = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${OPACITY})`;
  shapeRef.current = geometricShape;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouse = mouseRef.current;
    const shape = shapeRef.current;
    timeRef.current += 1;
    const t = timeRef.current;
    const stroke = strokeRef.current;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    ctx.lineWidth = shape === "mesh" ? 0.9 : 0.8;

    if (shape === "grid") {
      for (let x = 0; x <= width + GRID_SPACING; x += GRID_SPACING) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height + GRID_SPACING; y += GRID_SPACING) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    if (shape === "hexagons") {
      const r = HEX_RADIUS;
      const vert = r * Math.sqrt(3);
      for (let row = -1; row * (r * 1.5) < height + r * 2; row++) {
        for (let col = -1; col * (vert * 2) < width + vert * 2; col++) {
          const cx = col * vert * 2 + (row % 2 === 0 ? 0 : vert);
          const cy = row * r * 1.5;
          drawHexagon(ctx, cx, cy, r);
        }
      }
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    if (shape === "dots") {
      for (let x = PADDING; x < width - PADDING; x += DOTS_SPACING) {
        for (let y = PADDING; y < height - PADDING; y += DOTS_SPACING) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // shape === "mesh"
    if (pointsRef.current.length === 0) {
      pointsRef.current = getRandomMeshPoints(width, height);
      edgesRef.current = getEdges(pointsRef.current);
    }

    const points = pointsRef.current;
    const edges = edgesRef.current;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dx = mouse.x - p.baseX;
      const dy = mouse.y - p.baseY;
      const d = Math.sqrt(dx * dx + dy * dy);

      let targetDx = 0;
      let targetDy = 0;
      if (d < INFLUENCE_RADIUS && d > 0) {
        const influence = 1 - d / INFLUENCE_RADIUS;
        const strength = influence * influence * MAX_DISPLACEMENT;
        targetDx = (dx / d) * strength;
        targetDy = (dy / d) * strength;
      }

      p.dx += (targetDx - p.dx) * LERP;
      p.dy += (targetDy - p.dy) * LERP;

      const floatX = p.floatAmp * Math.sin(t * p.floatSpeed + p.floatPhase);
      const floatY = p.floatAmp * Math.cos(t * p.floatSpeed + p.floatPhase * 0.7);

      p.x = p.baseX + p.dx + floatX;
      p.y = p.baseY + p.dy + floatY;
    }

    for (const [i, j] of edges) {
      const a = points[i];
      const b = points[j];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio ?? 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      pointsRef.current = getRandomMeshPoints(rect.width, rect.height);
      edgesRef.current = getEdges(pointsRef.current);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      aria-hidden
    />
  );
}
