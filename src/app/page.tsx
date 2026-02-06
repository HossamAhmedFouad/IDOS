"use client";

import { ModeProvider } from "@/features/workspace/mode-provider";
import { WorkspaceView } from "@/features/workspace/workspace-view";

export default function Home() {
  return (
    <ModeProvider>
      <WorkspaceView />
    </ModeProvider>
  );
}
