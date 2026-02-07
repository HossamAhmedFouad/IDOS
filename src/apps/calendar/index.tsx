"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import type { AppProps } from "@/lib/types";
import { readFile, writeFile } from "@/lib/file-system";
import { useToolRegistry } from "@/store/use-tool-registry";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { calendarTools } from "./tools";

const DEFAULT_PATH = "/calendar/events.json";
const SCHEDULE_START_HOUR = 0;
const SCHEDULE_END_HOUR = 23;

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatTime12h(value: string): string {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const hour = h ?? 0;
  const min = m ?? 0;
  const period = hour < 12 ? "AM" : "PM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const minStr = min > 0 ? `:${String(min).padStart(2, "0")}` : "";
  return `${hour12}${minStr} ${period}`;
}

const TIME_OPTIONS = (() => {
  const opts: { display: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      opts.push({ display: formatTime12h(value), value });
    }
  }
  return opts;
})();

export function CalendarApp({ config }: AppProps) {
  const filePath = (config?.filePath as string | undefined) ?? DEFAULT_PATH;
  const registerTool = useToolRegistry((s) => s.registerTool);
  const unregisterTool = useToolRegistry((s) => s.unregisterTool);

  useEffect(() => {
    calendarTools.forEach((tool) => registerTool(tool));
    return () => calendarTools.forEach((tool) => unregisterTool(tool.name));
  }, [registerTool, unregisterTool]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date());
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(() => new Date());
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
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
    const dateStr = date ? formatDate(date) : formatDate(selectedDate ?? new Date());
    const newEvent: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: t,
      date: dateStr,
      time: time.trim() || undefined,
      endTime: endTime.trim() || undefined,
    };
    const newEvents = [...events, newEvent].sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.time ?? "").localeCompare(b.time ?? "") ||
        (a.endTime ?? "").localeCompare(b.endTime ?? "")
    );
    setEvents(newEvents);
    saveEvents(newEvents);
    setTitle("");
    setDate(selectedDate ?? new Date());
    setTime("");
    setEndTime("");
    setShowForm(false);
  }, [title, date, time, endTime, events, saveEvents, selectedDate]);

  const deleteEvent = useCallback(
    (id: string) => {
      const newEvents = events.filter((e) => e.id !== id);
      setEvents(newEvents);
      saveEvents(newEvents);
    },
    [events, saveEvents]
  );

  const openAddForm = useCallback(() => {
    setDate(selectedDate ?? new Date());
    setTime("");
    setEndTime("");
    setShowForm(true);
  }, [selectedDate]);

  const activeDate = selectedDate ?? new Date();
  const selectedStr = formatDate(activeDate);
  const dayEvents = events.filter((e) => e.date === selectedStr);
  const timedEvents = dayEvents
    .filter((e) => e.time)
    .sort((a, b) => parseTime(a.time!) - parseTime(b.time!));
  const allDayEvents = dayEvents.filter((e) => !e.time);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      {saving && (
        <div className="mb-2 text-xs text-muted-foreground">Saving...</div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        {/* Left column: Calendar */}
        <div className="flex flex-col overflow-auto">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => setSelectedDate(d ?? undefined)}
            className="rounded-lg border"
          />
        </div>

        {/* Right column: Events / Timeline */}
        <div className="flex min-h-0 flex-col overflow-auto">
          <h4 className="mb-2 shrink-0 text-sm font-medium text-foreground">
            {format(activeDate, "EEEE, MMM d")}
          </h4>

          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div className="mb-2 shrink-0 rounded border border-border bg-muted/50 p-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                All day
              </p>
              <ul className="space-y-1">
                {allDayEvents.map((evt) => (
                  <li
                    key={evt.id}
                    className="flex items-center justify-between gap-2 rounded border border-border bg-card px-2 py-1"
                  >
                    <span className="text-sm text-foreground">{evt.title}</span>
                    <button
                      type="button"
                      onClick={() => deleteEvent(evt.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Day schedule (hourly) */}
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="space-y-0 border border-border">
              {Array.from(
                {
                  length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1,
                },
                (_, i) => SCHEDULE_START_HOUR + i
              ).map((hour) => {
                const slotEvents = timedEvents.filter((e) => {
                  const start = parseTime(e.time!);
                  const h = hour * 60;
                  return start >= h && start < h + 60;
                });
                return (
                  <div
                    key={hour}
                    className="flex min-h-[2.5rem] border-b border-border last:border-b-0"
                  >
                    <div className="w-12 shrink-0 border-r border-border py-1 pr-2 text-right text-xs text-muted-foreground">
                      {hour === 0
                        ? "12 AM"
                        : hour < 12
                          ? `${hour} AM`
                          : hour === 12
                            ? "12 PM"
                            : `${hour - 12} PM`}
                    </div>
                    <div className="min-w-0 flex-1 p-1">
                      {slotEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="mb-1 flex items-center justify-between rounded border border-primary/30 bg-primary/10 px-2 py-1"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {evt.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime12h(evt.time)}
                              {evt.endTime ? ` – ${formatTime12h(evt.endTime)}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteEvent(evt.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add event form */}
          <div className="mt-3 shrink-0">
            {showForm ? (
              <div className="space-y-2 rounded border border-border bg-muted p-3">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {date ? format(date, "PPP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        <Clock className="mr-2 size-4" />
                        {time ? formatTime12h(time) : "Start time"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="max-h-48 overflow-auto">
                        <button
                          type="button"
                          onClick={() => setTime("")}
                          className={`block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-accent ${
                            !time ? "bg-accent font-medium" : ""
                          }`}
                        >
                          None (all day)
                        </button>
                        {TIME_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTime(opt.value)}
                            className={`block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-accent ${
                              time === opt.value ? "bg-accent font-medium" : ""
                            }`}
                          >
                            {opt.display}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                      >
                        <Clock className="mr-2 size-4" />
                        {endTime ? formatTime12h(endTime) : "End (optional)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="max-h-48 overflow-auto">
                        <button
                          type="button"
                          onClick={() => setEndTime("")}
                          className={`block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-accent ${
                            !endTime ? "bg-accent font-medium" : ""
                          }`}
                        >
                          None
                        </button>
                        {TIME_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEndTime(opt.value)}
                            className={`block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-accent ${
                              endTime === opt.value ? "bg-accent font-medium" : ""
                            }`}
                          >
                            {opt.display}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addEvent}>Add</Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={openAddForm}
              >
                + Add event
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
