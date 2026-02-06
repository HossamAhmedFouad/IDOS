"use client";

import { useEffect, useState, useCallback } from "react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";

const DEFAULT_PATH = "/calendar/events.json";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
}

function loadEventsFromJson(json: string): CalendarEvent[] {
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function CalendarApp({ config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const text = await readFile(filePath);
      setEvents(loadEventsFromJson(text));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const saveEvents = useCallback(
    async (newEvents: CalendarEvent[]) => {
      setSaving(true);
      try {
        await writeFile(filePath, JSON.stringify(newEvents, null, 2));
      } finally {
        setSaving(false);
      }
    },
    [filePath]
  );

  const addEvent = useCallback(() => {
    const t = title.trim();
    if (!t) return;
    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: t,
      date,
      time: time.trim() || undefined,
    };
    const newEvents = [...events, newEvent].sort(
      (a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "")
    );
    setEvents(newEvents);
    saveEvents(newEvents);
    setTitle("");
    setDate(formatDate(new Date()));
    setTime("");
    setShowForm(false);
  }, [title, date, time, events, saveEvents]);

  const deleteEvent = useCallback(
    (id: string) => {
      const newEvents = events.filter((e) => e.id !== id);
      setEvents(newEvents);
      saveEvents(newEvents);
    },
    [events, saveEvents]
  );

  const currentStr = formatDate(currentDate);
  const dayEvents = events.filter((e) => e.date === currentStr);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</span>
      </div>
    );
  }

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  return (
    <div className="flex h-full flex-col p-4">
      {saving && (
        <div className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Saving...</div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevDay}
          className="rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ←
        </button>
        <h3 className="text-sm font-medium">{currentStr}</h3>
        <button
          type="button"
          onClick={nextDay}
          className="rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          →
        </button>
      </div>
      {showForm ? (
        <div className="mb-4 flex flex-col gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="Time (optional)"
            className="rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addEvent}
              className="rounded bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-600"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mb-4 rounded border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500"
        >
          + Add event
        </button>
      )}
      <ul className="flex-1 space-y-2 overflow-auto">
        {dayEvents.map((evt) => (
          <li
            key={evt.id}
            className="flex items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{evt.title}</p>
              {evt.time && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{evt.time}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => deleteEvent(evt.id)}
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
