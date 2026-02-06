"use client";

import { useAppStore } from "@/store/use-app-store";

export function Counter() {
  const { count, increment, decrement } = useAppStore();

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4">
      <button
        type="button"
        onClick={decrement}
        className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600"
      >
        −
      </button>
      <span className="min-w-[2rem] text-center text-lg font-semibold">
        {count}
      </span>
      <button
        type="button"
        onClick={increment}
        className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600"
      >
        +
      </button>
    </div>
  );
}
