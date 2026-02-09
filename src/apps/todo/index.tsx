"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";
import { useToolRegistry } from "@/store/use-tool-registry";
import { useWorkspaceStore } from "@/store/use-workspace-store";
import { useAgentStore } from "@/store/use-agent-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTodoTools } from "./tools";

const DEFAULT_PATH = "/todo/tasks.json";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const TaskRow = memo(function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li
      id={task.id}
      data-task-id={task.id}
      className="flex items-center gap-2 rounded border border-border bg-muted px-3 py-2"
    >
      <span className="task-checkbox inline-flex items-center">
        <input
          type="checkbox"
          checked={task.done}
          onChange={() => onToggle(task.id)}
          className="h-4 w-4 rounded border-border"
        />
      </span>
      <span
        className={`flex-1 text-sm ${
          task.done ? "text-muted-foreground line-through" : "text-foreground"
        }`}
      >
        {task.text}
      </span>
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="text-muted-foreground hover:text-destructive"
      >
        ×
      </button>
    </li>
  );
});

function loadTasksFromJson(json: string): Task[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function TodoApp({ id, config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const registerTool = useToolRegistry((s) => s.registerTool);
  const todoTools = useMemo(() => createTodoTools(id), [id]);

  useEffect(() => {
    todoTools.forEach((tool) => registerTool(tool));
    // Do not unregister on unmount: agent may still have in-flight tool calls for this app.
  }, [todoTools, registerTool]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const text = await readFile(filePath);
      setTasks(loadTasksFromJson(text));
    } catch {
      setTasks([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadTasks(false);
  }, [loadTasks]);

  const view = useWorkspaceStore((s) => s.view);
  const agentDataVersion = useAgentStore((s) => s.agentDataVersion);
  useEffect(() => {
    if (view === "agent" && agentDataVersion > 0) {
      // Silent reload when agent modifies data - avoids full "Loading..." re-render
      loadTasks(true);
    }
  }, [view, agentDataVersion, loadTasks]);

  const saveTasks = useCallback(async (newTasks: Task[]) => {
    const showSavingAfter = setTimeout(() => setSaving(true), 300);
    try {
      await writeFile(filePath, JSON.stringify(newTasks, null, 2));
    } finally {
      clearTimeout(showSavingAfter);
      setSaving(false);
    }
  }, [filePath]);

  const addTask = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      text,
      done: false,
    };
    setInput("");
    setTasks((prev) => {
      const next = [...prev, newTask];
      queueMicrotask(() => saveTasks(next));
      return next;
    });
  }, [input, saveTasks]);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      );
      queueMicrotask(() => saveTasks(next));
      return next;
    });
  }, [saveTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      queueMicrotask(() => saveTasks(next));
      return next;
    });
  }, [saveTasks]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div id={id} className="flex h-full flex-col p-4">
      <div className="mb-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task..."
          className="flex-1"
        />
        <Button type="button" onClick={addTask}>
          Add
        </Button>
      </div>
      {saving && (
        <div className="mb-2 text-xs text-muted-foreground">Saving...</div>
      )}
      <ul id={`${id}-list`} data-task-list className="flex-1 space-y-2 overflow-auto">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        ))}
        <li key="todo-list-bottom" id="todo-list-bottom" className="h-0 overflow-hidden" aria-hidden />
      </ul>
    </div>
  );
}
