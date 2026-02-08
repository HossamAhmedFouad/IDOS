# Agent Tools Reference & Combined Scenarios

This document lists all **currently implemented tools** available to the Intent-Driven OS AI agent and describes **scenarios** that can be achieved by combining them.

**Last updated:** February 2026

---

## Overview

Tools are registered from nine apps when the user is on **Home** or **Agent** view. The agent receives every registered tool's name, description, and parameters and chooses which to call based on the user's intent. All app data is stored in the virtual file system (e.g. `/notes/`, `/todo/tasks.json`, `/calendar/events.json`).

| App            | Tool count | Purpose                                |
|----------------|------------|----------------------------------------|
| **Notes**      | 3          | Create, search, append notes            |
| **Todo**       | 3          | Add, list, complete tasks               |
| **Calendar**   | 3          | List, create, delete events             |
| **File Browser** | 5        | List, read, write, move, delete files   |
| **Timer**      | 3          | Start, reset, pause countdown timer     |
| **Code Editor** | 3        | Write, read, highlight code files       |
| **Email**      | 3          | Compose, send draft, add attachments    |
| **Whiteboard** | 3          | Draw shapes, add text, clear canvas     |
| **Quiz**       | 4          | Add cards, list cards/topics, start session |

---

## 1. Notes tools

| Tool | Description |
|------|-------------|
| `notes_create_note` | Create a new note with specified content and save to the file system under `/notes/` |
| `notes_search_notes` | Search notes under `/notes` by content. Returns list of matching file paths and snippets. |
| `notes_append_to_note` | Append content to an existing note file. |

### notes_create_note

- **Parameters:** `filename` (string), `content` (string), `animated` (optional boolean)
- **Example:** Create `meeting.txt` with agenda text.

### notes_search_notes

- **Parameters:** `query` (string) — text to find in note content
- **Returns:** `matches[]` with `path` and `snippet`.

### notes_append_to_note

- **Parameters:** `path` (string, e.g. `/notes/meeting.txt`), `content` (string)
- **Example:** Add follow-up items to an existing note.

---

## 2. Todo tools

| Tool | Description |
|------|-------------|
| `todo_add_task` | Add a new task to the todo list |
| `todo_complete_task` | Mark a task as completed by its id |
| `todo_list_tasks` | Get all tasks, optionally filtered by completion status |

### todo_add_task

- **Parameters:** `title` (string, required), `priority` (optional: `"low" \| "medium" \| "high"`), `dueDate` (optional, ISO string)
- **Example:** Add "Review PR" with high priority.

### todo_complete_task

- **Parameters:** `taskId` (string, e.g. `task-123`)
- **Example:** Mark a specific task done after listing tasks.

### todo_list_tasks

- **Parameters:** `completed` (optional boolean) — filter by done/pending
- **Returns:** `tasks[]` and `count`.

---

## 3. Calendar tools

| Tool | Description |
|------|-------------|
| `calendar_list_events` | List calendar events, optionally filtered by date (YYYY-MM-DD) |
| `calendar_create_event` | Create a new calendar event |
| `calendar_delete_event` | Delete a calendar event by id |

### calendar_list_events

- **Parameters:** `date` (optional string, YYYY-MM-DD)
- **Returns:** `events[]` and `count`.

### calendar_create_event

- **Parameters:** `title` (string), `date` (string, YYYY-MM-DD), `time` (optional, e.g. `14:00`), `endTime` (optional)
- **Example:** Schedule "Team standup" on 2026-02-10 at 09:00.

### calendar_delete_event

- **Parameters:** `eventId` (string, e.g. `evt-123`)
- **Example:** Remove an event after listing to find its id.

---

## 4. File Browser tools

| Tool | Description |
|------|-------------|
| `file_browser_list_directory` | List files and folders in a directory path |
| `file_browser_read_file` | Read content of a file (truncated if large) |
| `file_browser_write_file` | Write content to a file (creates or overwrites) |
| `file_browser_move_file` | Move a file or path to a new location |
| `file_browser_delete_file` | Delete a file at the given path |

### file_browser_list_directory

- **Parameters:** `path` (string, e.g. `/` or `/notes`)
- **Returns:** `path`, `entries[]`.

### file_browser_read_file

- **Parameters:** `path` (string)
- **Returns:** `path`, `content` (truncated at ~8k chars if large).

### file_browser_write_file

- **Parameters:** `path` (string), `content` (string)
- **Example:** Create or overwrite any file (e.g. outside `/notes`).

### file_browser_move_file

- **Parameters:** `oldPath` (string), `newPath` (string)
- **Example:** Reorganize notes into subfolders.

### file_browser_delete_file

- **Parameters:** `path` (string)
- **Example:** Remove old or duplicate files.

---

## 5. Timer tools

| Tool | Description |
|------|-------------|
| `timer_start` | Start the timer with a duration in seconds |
| `timer_reset` | Reset and stop the timer |
| `timer_pause` | Pause the running timer |

### timer_start

- **Parameters:** `durationSeconds` (number, e.g. 300 for 5 min, 60 for 1 min)
- **Example:** Start a 25-minute focus timer.

### timer_reset

- **Parameters:** `presetMinutes` (optional number, e.g. 25)
- **Example:** Reset the timer to 25 minutes and stop it.

### timer_pause

- **Parameters:** none
- **Example:** Pause the running timer.

---

## 6. Code Editor tools

| Tool | Description |
|------|-------------|
| `code_editor_write` | Write content to a file (creates or overwrites) |
| `code_editor_read_file` | Read content of a file |
| `code_editor_highlight_lines` | Highlight specific lines in the code editor |

### code_editor_write

- **Parameters:** `path` (string, e.g. `/code/main.js`), `content` (string), `animated` (optional boolean)
- **Example:** Create or overwrite a file with code.

### code_editor_read_file

- **Parameters:** `path` (string)
- **Returns:** `path`, `content`.

### code_editor_highlight_lines

- **Parameters:** `lineNumbers` (array of numbers, 1-based)
- **Example:** Highlight lines 5–10 for review.

---

## 7. Email tools

| Tool | Description |
|------|-------------|
| `email_compose` | Compose or update an email draft (to, subject, body) |
| `email_send` | Send the current email draft |
| `email_add_attachment` | Add an attachment indicator to the draft |

### email_compose

- **Parameters:** `to` (optional string), `subject` (optional string), `body` (optional string), `animated` (optional boolean)
- **Example:** Draft an email to someone@example.com with a subject and body.

### email_send

- **Parameters:** none (uses current draft from `/email/draft.json`)
- **Example:** Send the composed draft.

### email_add_attachment

- **Parameters:** `fileName` (string), `fileSize` (optional string, e.g. "1.2 MB")
- **Example:** Add a visual attachment indicator.

---

## 8. Whiteboard tools

| Tool | Description |
|------|-------------|
| `whiteboard_draw_shape` | Draw a shape (rectangle or circle) |
| `whiteboard_draw_line` | Draw a line or arrow from (x1,y1) to (x2,y2) |
| `whiteboard_add_text` | Add text at a position |
| `whiteboard_clear` | Clear the whiteboard |

### whiteboard_draw_shape

- **Parameters:** `shape` (string: `rectangle` \| `circle`), `x` (number), `y` (number), `width` (optional), `height` (optional), `color` (optional), `fillColor` (optional)
- **Color:** Use a name (`black`, `red`, `blue`, `green`, `yellow`, `orange`, `purple`, `gray`, `white`) or hex (e.g. `#ff0000`). `color` = stroke/outline; `fillColor` = fill.
- **Example:** Draw a red rectangle at (100, 100) with size 80×60 and blue fill: `whiteboard_draw_shape` with shape=rectangle, x=100, y=100, width=80, height=60, color=red, fillColor=blue.

### whiteboard_draw_line

- **Parameters:** `shape` (string: `line` \| `arrow`), `x1`, `y1`, `x2`, `y2`, `color` (optional)
- **Color:** Same as above (name or hex).
- **Example:** Draw a green arrow from (50, 50) to (200, 100): shape=arrow, x1=50, y1=50, x2=200, y2=100, color=green.

### whiteboard_add_text

- **Parameters:** `text` (string), `x` (number), `y` (number), `color` (optional)
- **Color:** Same as above (name or hex).
- **Example:** Add "Hello" in blue at (100, 100): text=Hello, x=100, y=100, color=blue.

### whiteboard_clear

- **Parameters:** `wipeDuration` (optional number, ms)
- **Example:** Clear the whiteboard canvas.

---

## 9. Quiz tools

| Tool | Description |
|------|-------------|
| `quiz_add_card` | Add a flashcard to a topic/deck |
| `quiz_list_cards` | List flashcards in a topic |
| `quiz_list_topics` | List all quiz topics/decks |
| `quiz_start_session` | Start a quiz session for a topic |

### quiz_add_card

- **Parameters:** `topic` (string), `front` (string), `back` (string)
- **Example:** Add a vocabulary card: front "hello", back "hola".

### quiz_list_cards

- **Parameters:** `topic` (string)
- **Returns:** `topic`, `cards[]`, `count`.

### quiz_list_topics

- **Parameters:** none
- **Returns:** `topics[]`, `count`.

### quiz_start_session

- **Parameters:** `topic` (string)
- **Example:** Start practicing the "vocabulary" deck.

---

## Combined scenarios

The following are **example scenarios** the agent can achieve by chaining multiple tools. The agent decides the order and arguments from the user's natural-language intent.

### Research & capture

- **Intent:** "Find all notes that mention 'budget' and create a summary note."
- **Tools:** `notes_search_notes` → (optional) `file_browser_read_file` for full content → `notes_create_note` with summary.
- **Flow:** Search by query, then create a new note whose content is a synthesized summary of the matches.

### Meeting prep

- **Intent:** "What's on my calendar tomorrow and what tasks are still pending?"
- **Tools:** `calendar_list_events` (date = tomorrow) + `todo_list_tasks` (completed = false).
- **Flow:** Agent returns calendar and open tasks so the user can plan the day.

### Schedule from tasks

- **Intent:** "Add a calendar event for each high-priority task due this week."
- **Tools:** `todo_list_tasks` → filter by priority/due (in agent logic) → `calendar_create_event` for each.
- **Flow:** List tasks, then create one event per selected task with title/date (and optional time).

### Cleanup and organize

- **Intent:** "List everything in /notes, then move all .txt files into /notes/archive."
- **Tools:** `file_browser_list_directory` (/notes) → for each .txt: `file_browser_move_file` to `/notes/archive/`.
- **Flow:** List first, then move matching files; agent can infer "archive" path or use user wording.

### Post-meeting workflow

- **Intent:** "Create a meeting note for 'Q1 planning', add three bullet points, and add a todo to follow up on action items."
- **Tools:** `notes_create_note` (filename + content with bullets) → `todo_add_task` (e.g. "Follow up Q1 planning action items").
- **Flow:** One note creation, then one task; both can reference the same meeting in their text.

### Find and update

- **Intent:** "Find the note that contains 'project timeline' and append 'Updated: delay by one week.'"
- **Tools:** `notes_search_notes` (query: "project timeline") → `notes_append_to_note` (path from match, content).
- **Flow:** Search returns paths/snippets; agent picks the relevant path and appends.

### Bulk export / copy

- **Intent:** "List my notes and create a single file that lists all note names and their first line."
- **Tools:** `file_browser_list_directory` (/notes) → for each file: `file_browser_read_file` → `file_browser_write_file` (e.g. `/notes/index.txt` with names + first lines).
- **Flow:** List, read each (possibly truncated), aggregate, write one index file.

### Tidy after completion

- **Intent:** "Mark the task 'Send report' as done and add a short note that it was sent."
- **Tools:** `todo_list_tasks` → find task id for "Send report" → `todo_complete_task` (taskId) → `notes_create_note` or `notes_append_to_note` with "Report sent on …".
- **Flow:** List tasks to get id, complete task, then update notes.

### Delete old or redundant data

- **Intent:** "Delete the calendar event with id evt-456" or "Remove the file /notes/draft-old.txt."
- **Tools:** `calendar_delete_event` (eventId) or `file_browser_delete_file` (path).
- **Flow:** Single tool; for "cancel my meeting tomorrow" the agent would use `calendar_list_events` first to find the event id, then `calendar_delete_event`.

### Cross-app summary

- **Intent:** "Give me a quick summary: how many open tasks, how many events this week, and how many notes I have."
- **Tools:** `todo_list_tasks` (completed: false) → `calendar_list_events` (optionally filtered by date range in agent logic) → `file_browser_list_directory` (/notes).
- **Flow:** Three tool calls; agent aggregates counts and wording into one summary.

### Focus timer

- **Intent:** "Start a 25-minute focus timer."
- **Tools:** `timer_start` (durationSeconds: 1500).
- **Flow:** Starts countdown; app shows ripple animation and runs until complete.

### Code snippet and email

- **Intent:** "Write a hello-world function to /code/hello.js, then draft an email to share it."
- **Tools:** `code_editor_write` (path, content) → `email_compose` (to, subject, body referencing the file).
- **Flow:** Create code file, then compose email draft.

### Send follow-up email

- **Intent:** "Draft and send an email to remind Bob about the meeting."
- **Tools:** `email_compose` (to, subject, body) → `email_send`.
- **Flow:** Compose draft, then send.

### Whiteboard brainstorm

- **Intent:** "Draw a rectangle and add text 'Ideas' on the whiteboard."
- **Tools:** `whiteboard_draw_shape` (shape: rectangle, x, y, width, height) → `whiteboard_add_text` (text: "Ideas", x, y).
- **Flow:** Add shape, then add label.

### Build a quiz deck

- **Intent:** "Add three Spanish vocabulary cards to the 'spanish' topic."
- **Tools:** `quiz_add_card` (topic: "spanish", front, back) × 3.
- **Flow:** Add multiple flashcards to a deck.

### Study session setup

- **Intent:** "List my quiz topics and start a session for vocabulary."
- **Tools:** `quiz_list_topics` → `quiz_start_session` (topic: "vocabulary").
- **Flow:** List decks, then start practicing one.

---

## Quick reference: tool names

```
notes_create_note          notes_search_notes          notes_append_to_note
todo_add_task              todo_complete_task          todo_list_tasks
calendar_list_events       calendar_create_event       calendar_delete_event
file_browser_list_directory   file_browser_read_file   file_browser_write_file
file_browser_move_file      file_browser_delete_file
timer_start                 timer_reset                 timer_pause
code_editor_write           code_editor_read_file       code_editor_highlight_lines
email_compose               email_send                  email_add_attachment
whiteboard_draw_shape       whiteboard_draw_line        whiteboard_add_text         whiteboard_clear
quiz_add_card               quiz_list_cards             quiz_list_topics
quiz_start_session
```

**Total: 30 tools** across 9 apps.

---

## Related docs

- **Architecture & tool contract:** `Documentation/ai_agent_plan.md`
- **Where tools are registered:** `src/components/agent-tool-registration.tsx`
- **Tool registry store:** `src/store/use-tool-registry.ts`
- **UI update animations:** `Documentation/Enhanced_Tool_Ui_Update_Execution.md`
