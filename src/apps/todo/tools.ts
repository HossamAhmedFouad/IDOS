"use client";

import { readFile, writeFile } from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";

const DEFAULT_PATH = "/todo/tasks.json";

interface Task {
  id: string;
  text: string;
  done: boolean;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
}

function loadTasksFromJson(json: string): Task[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Todo tools. Pass appInstanceId for scroll target (e.g. todo-list-bottom in the app DOM).
 */
export function createTodoTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "todo_add_task",
      description: "Add a new task to the todo list",
      appId: "todo",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          priority: {
            type: "string",
            description: "Priority level",
            enum: ["low", "medium", "high"],
          },
          dueDate: { type: "string", description: "Due date in ISO format (optional)" },
        },
        required: ["title"],
      },
      execute: async (params) => {
        const text = String(params.title ?? "").trim();
        if (!text) return { success: false, error: "title is required" };
        let taskList: Task[];
        try {
          const raw = await readFile(DEFAULT_PATH);
          taskList = loadTasksFromJson(raw);
        } catch {
          taskList = [];
        }
        const priority = (params.priority as "low" | "medium" | "high") || "medium";
        const dueDate = typeof params.dueDate === "string" && params.dueDate.trim() ? params.dueDate.trim() : undefined;
        const newTask: Task = {
          id: `task-${Date.now()}`,
          text,
          done: false,
          priority,
          dueDate,
        };
        taskList.push(newTask);
        await writeFile(DEFAULT_PATH, JSON.stringify(taskList, null, 2));
        return {
          success: true,
          data: newTask,
          uiUpdate: {
            type: "todo_task_pop_in",
            targetId: `${appInstanceId}-list`,
            taskData: {
              title: newTask.text,
              priority,
              position: taskList.length - 1,
            },
          },
        };
      },
    },
    {
      name: "todo_complete_task",
      description: "Mark a task as completed by its id",
      appId: "todo",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "ID of task to complete (e.g. task-123)" },
        },
        required: ["taskId"],
      },
      execute: async (params) => {
        const taskId = String(params.taskId ?? "").trim();
        if (!taskId) return { success: false, error: "taskId is required" };
        let taskList: Task[];
        try {
          const raw = await readFile(DEFAULT_PATH);
          taskList = loadTasksFromJson(raw);
        } catch {
          return { success: false, error: "Could not load tasks" };
        }
        const task = taskList.find((t) => t.id === taskId);
        if (!task) return { success: false, error: "Task not found" };
        task.done = true;
        await writeFile(DEFAULT_PATH, JSON.stringify(taskList, null, 2));
        return {
          success: true,
          data: task,
          uiUpdate: {
            type: "todo_check_animation",
            targetId: appInstanceId,
            taskId,
            strikethrough: true,
            confetti: true,
          },
        };
      },
    },
    {
      name: "todo_list_tasks",
      description: "Get all tasks, optionally filtered by completion status",
      appId: "todo",
      parameters: {
        type: "object",
        properties: {
          completed: {
            type: "boolean",
            description: "Filter by completion status (optional)",
          },
        },
        required: [],
      },
      execute: async (params) => {
        let taskList: Task[];
        try {
          const raw = await readFile(DEFAULT_PATH);
          taskList = loadTasksFromJson(raw);
        } catch {
          taskList = [];
        }
        const completed = params.completed as boolean | undefined;
        const filtered =
          completed !== undefined
            ? taskList.filter((t) => t.done === completed)
            : taskList;
        return {
          success: true,
          data: { tasks: filtered, count: filtered.length },
        };
      },
    },
    {
      name: "todo_delete_task",
      description: "Remove a task from the todo list by its id. Use after listing tasks to get the taskId.",
      appId: "todo",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "ID of task to remove (e.g. task-123)" },
        },
        required: ["taskId"],
      },
      execute: async (params) => {
        const taskId = String(params.taskId ?? "").trim();
        if (!taskId) return { success: false, error: "taskId is required" };
        let taskList: Task[];
        try {
          const raw = await readFile(DEFAULT_PATH);
          taskList = loadTasksFromJson(raw);
        } catch {
          return { success: false, error: "Could not load tasks" };
        }
        const idx = taskList.findIndex((t) => t.id === taskId);
        if (idx === -1) return { success: false, error: "Task not found" };
        taskList.splice(idx, 1);
        await writeFile(DEFAULT_PATH, JSON.stringify(taskList, null, 2));
        return { success: true, data: { taskId } };
      },
    },
  ];
}
