"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";

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
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task..."
          className="flex-1 rounded border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
        />
        <button
          type="button"
          onClick={addTask}
          className="rounded bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-600 dark:hover:bg-zinc-500"
        >
          Add
        </button>
      </div>
      {saving && (
        <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Saving...</div>
      )}
      <ul className="flex-1 space-y-2 overflow-auto">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task.id)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span
              className={`flex-1 text-sm ${
                task.done ? "text-zinc-500 line-through dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {task.text}
            </span>
            <button
              type="button"
              onClick={() => deleteTask(task.id)}
              className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
