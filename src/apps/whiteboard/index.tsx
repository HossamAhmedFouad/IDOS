"use client";

import dynamic from "next/dynamic";
import type { AppProps } from "@/lib/types";

const WHITEBOARD_DIR = "/whiteboard";

const ExcalidrawBoard = dynamic(
  () => import("./excalidraw-board").then((m) => m.ExcalidrawBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    ),
  }
);

export function WhiteboardApp({ id, config }: AppProps) {
  const filePath =
    (config?.filePath as string | undefined) ?? `${WHITEBOARD_DIR}/${id}.json`;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ExcalidrawBoard
          filePath={filePath}
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
