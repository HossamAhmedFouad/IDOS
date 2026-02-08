"use client";

import { readFile, writeFile } from "@/lib/file-system";
import type { AppTool } from "@/lib/types/agent";

const DEFAULT_PATH = "/calendar/events.json";

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

/**
 * Create calendar tools that use the given app instance id for uiUpdate.targetId.
 */
export function createCalendarTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "calendar_list_events",
      description: "List calendar events, optionally filtered by date (YYYY-MM-DD)",
      appId: "calendar",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Filter by date in YYYY-MM-DD format (optional)",
          },
        },
        required: [],
      },
      execute: async (params) => {
        let events: CalendarEvent[];
        try {
          const raw = await readFile(DEFAULT_PATH);
          events = loadEventsFromJson(raw);
        } catch {
          events = [];
        }
        const dateFilter = params.date as string | undefined;
        const filtered = dateFilter
          ? events.filter((e) => e.date === dateFilter)
          : events;
        return {
          success: true,
          data: { events: filtered, count: filtered.length },
          uiUpdate:
            dateFilter
              ? {
                  type: "calendar_date_jump",
                  targetId: appInstanceId,
                  fromDate: "",
                  toDate: dateFilter,
                  animated: true,
                }
              : undefined,
        };
      },
    },
    {
      name: "calendar_create_event",
      description: "Create a new calendar event",
      appId: "calendar",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          time: { type: "string", description: "Start time (optional, e.g. 14:00)" },
          endTime: { type: "string", description: "End time (optional)" },
        },
        required: ["title", "date"],
      },
      execute: async (params) => {
        const title = String(params.title ?? "").trim();
        const date = String(params.date ?? "").trim();
        if (!title || !date) return { success: false, error: "title and date are required" };
        let events: CalendarEvent[];
        try {
          const raw = await readFile(DEFAULT_PATH);
          events = loadEventsFromJson(raw);
        } catch {
          events = [];
        }
        const newEvent: CalendarEvent = {
          id: `evt-${Date.now()}`,
          title,
          date,
          time: params.time as string | undefined,
          endTime: params.endTime as string | undefined,
        };
        events.push(newEvent);
        await writeFile(DEFAULT_PATH, JSON.stringify(events, null, 2));
        const timeStr = newEvent.time ?? "All day";
        return {
          success: true,
          data: newEvent,
          uiUpdate: {
            type: "calendar_event_slide_in",
            targetId: `${appInstanceId}-event-list`,
            eventData: {
              title: newEvent.title,
              time: timeStr,
              date: newEvent.date,
            },
            direction: "left",
          },
        };
      },
    },
    {
      name: "calendar_delete_event",
      description: "Delete a calendar event by id",
      appId: "calendar",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "Event id (e.g. evt-123)" },
        },
        required: ["eventId"],
      },
      execute: async (params) => {
        const eventId = String(params.eventId ?? "").trim();
        if (!eventId) return { success: false, error: "eventId is required" };
        let events: CalendarEvent[];
        try {
          const raw = await readFile(DEFAULT_PATH);
          events = loadEventsFromJson(raw);
        } catch {
          return { success: false, error: "Could not load events" };
        }
        const idx = events.findIndex((e) => e.id === eventId);
        if (idx === -1) return { success: false, error: "Event not found" };
        events.splice(idx, 1);
        await writeFile(DEFAULT_PATH, JSON.stringify(events, null, 2));
        return { success: true, data: { eventId } };
      },
    },
    {
      name: "calendar_update_event",
      description: "Update an existing calendar event by id. Provide only the fields to change (title, date, time, endTime).",
      appId: "calendar",
      parameters: {
        type: "object",
        properties: {
          eventId: { type: "string", description: "Event id (e.g. evt-123)" },
          title: { type: "string", description: "New event title (optional)" },
          date: { type: "string", description: "New date in YYYY-MM-DD format (optional)" },
          time: { type: "string", description: "New start time (optional, e.g. 14:00)" },
          endTime: { type: "string", description: "New end time (optional)" },
        },
        required: ["eventId"],
      },
      execute: async (params) => {
        const eventId = String(params.eventId ?? "").trim();
        if (!eventId) return { success: false, error: "eventId is required" };
        let events: CalendarEvent[];
        try {
          const raw = await readFile(DEFAULT_PATH);
          events = loadEventsFromJson(raw);
        } catch {
          return { success: false, error: "Could not load events" };
        }
        const idx = events.findIndex((e) => e.id === eventId);
        if (idx === -1) return { success: false, error: "Event not found" };
        const event = events[idx];
        if (params.title !== undefined) event.title = String(params.title).trim();
        if (params.date !== undefined) event.date = String(params.date).trim();
        if (params.time !== undefined) event.time = params.time === "" ? undefined : (params.time as string);
        if (params.endTime !== undefined) event.endTime = params.endTime === "" ? undefined : (params.endTime as string);
        await writeFile(DEFAULT_PATH, JSON.stringify(events, null, 2));
        return {
          success: true,
          data: event,
          uiUpdate: {
            type: "calendar_event_slide_in",
            targetId: `${appInstanceId}-event-list`,
            eventData: {
              title: event.title,
              time: event.time ?? "All day",
              date: event.date,
            },
            direction: "left",
          },
        };
      },
    },
  ];
}
