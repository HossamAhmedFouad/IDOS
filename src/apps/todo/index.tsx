"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_PATH = "/todo/tasks.json";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

function loadTasksFromJson(json: string): Task[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function TodoApp({ config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const text = await readFile(filePath);
      setTasks(loadTasksFromJson(text));
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const saveTasks = useCallback(async (newTasks: Task[]) => {
    setSaving(true);
    try {
      await writeFile(filePath, JSON.stringify(newTasks, null, 2));
    } finally {
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
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    setInput("");
    saveTasks(newTasks);
  }, [input, tasks, saveTasks]);

  const toggleTask = useCallback((id: string) => {
    const newTasks = tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    setTasks(newTasks);
    saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const deleteTask = useCallback((id: string) => {
    const newTasks = tasks.filter((t) => t.id !== id);
    setTasks(newTasks);
    saveTasks(newTasks);
  }, [tasks, saveTasks]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
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
      <ul className="flex-1 space-y-2 overflow-auto">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-2 rounded border border-border bg-muted px-3 py-2"
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task.id)}
              className="h-4 w-4 rounded border-border"
            />
            <span
              className={`flex-1 text-sm ${
                task.done ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {task.text}
            </span>
            <button
              type="button"
              onClick={() => deleteTask(task.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
