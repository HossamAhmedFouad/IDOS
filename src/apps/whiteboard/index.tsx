"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";

const DEFAULT_PATH = "/whiteboard/diagram.json";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
}

function loadStrokesFromJson(json: string): Stroke[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function WhiteboardApp({ config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadStrokes = useCallback(async () => {
    setLoading(true);
    try {
      const text = await readFile(filePath);
      setStrokes(loadStrokesFromJson(text));
    } catch {
      setStrokes([]);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadStrokes();
  }, [loadStrokes]);

  const saveStrokes = useCallback(
    async (newStrokes: Stroke[]) => {
      setSaving(true);
      try {
        await writeFile(filePath, JSON.stringify(newStrokes));
      } finally {
        setSaving(false);
      }
    },
    [filePath]
  );

  const getCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = getCoords(e);
      setCurrentStroke({ points: [{ x, y }], color: "#1f2937" });
    },
    [getCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!currentStroke) return;
      const { x, y } = getCoords(e);
      setCurrentStroke((s) => (s ? { ...s, points: [...s.points, { x, y }] } : null));
    },
    [currentStroke, getCoords]
  );

  const handleMouseUp = useCallback(() => {
    if (currentStroke && currentStroke.points.length > 1) {
      const newStrokes = [...strokes, currentStroke];
      setStrokes(newStrokes);
      saveStrokes(newStrokes);
    }
    setCurrentStroke(null);
  }, [currentStroke, strokes, saveStrokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redraw();
      }
    };
    const redraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineWidth = 2;
      strokes.forEach((stroke) => {
        if (stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      });
      if (currentStroke && currentStroke.points.length >= 2) {
        ctx.strokeStyle = currentStroke.color;
        ctx.beginPath();
        ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y);
        currentStroke.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? canvas);
    return () => ro.disconnect();
  }, [strokes, currentStroke]);

  const handleClear = useCallback(() => {
    if (!confirm("Clear whiteboard?")) return;
    setStrokes([]);
    saveStrokes([]);
  }, [saveStrokes]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
        <button
          type="button"
          onClick={handleClear}
          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Clear
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair bg-background"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}
