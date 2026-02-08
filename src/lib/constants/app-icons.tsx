import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Timer,
  CheckSquare,
  Code2,
  HelpCircle,
  Mail,
  Calendar,
  FolderOpen,
  PenTool,
  Bot,
  BookOpen,
  Terminal,
} from "lucide-react";
import type { AppId } from "@/lib/types";

export const APP_ICONS: Record<AppId, LucideIcon> = {
  notes: FileText,
  timer: Timer,
  todo: CheckSquare,
  "code-editor": Code2,
  quiz: HelpCircle,
  email: Mail,
  calendar: Calendar,
  "file-browser": FolderOpen,
  whiteboard: PenTool,
  "ai-chat": Bot,
  "explanation-panel": BookOpen,
  terminal: Terminal,
};

export function getAppIcon(id: AppId): LucideIcon {
  return APP_ICONS[id] ?? FileText;
}
