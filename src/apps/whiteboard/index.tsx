"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { AppProps } from "@/lib/types";
import { useToolRegistry } from "@/store/use-tool-registry";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useAgentStore } from "@/store/use-agent-store";
import { createWhiteboardTools } from "./tools";

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
  const registerTool = useToolRegistry((s) => s.registerTool);
  const whiteboardTools = useMemo(() => createWhiteboardTools(id), [id]);

  useEffect(() => {
    whiteboardTools.forEach((tool) => registerTool(tool));
    // Do not unregister on unmount: agent may still have in-flight tool calls for this app.
  }, [whiteboardTools, registerTool]);

  const view = useWorkspaceStore((s) => s.view);
  const agentDataVersion = useAgentStore((s) => s.agentDataVersion);
  const reloadTrigger = view === "agent" ? agentDataVersion : undefined;

  return (
    <div id={id} data-whiteboard className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ExcalidrawBoard
          filePath={filePath}
          className="absolute inset-0 h-full w-full"
          reloadTrigger={reloadTrigger}
        />
      </div>
    </div>
  );
}
