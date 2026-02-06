# Intent-Driven OS User Manual

## Overview

The Intent-Driven OS lets you create workspaces by describing what you want to do in plain language. Type an intent like "take notes and set a timer" and the system creates the right apps and layout for you.

## Describing Your Intent

### Basic Examples

- **"take notes"** – Opens the Notes app
- **"timer"** or **"25 minute timer"** – Opens the Timer app
- **"todo list"** – Opens the Todo app
- **"write email"** – Opens the Email Composer
- **"study with flashcards"** – Opens the Quiz app
- **"code and browse files"** – Opens Code Editor and File Browser side by side

### Combining Activities

You can request multiple apps in one intent:

- "notes and timer for deep work"
- "calendar and notes for meeting prep"
- "code editor, file browser, and AI chat"

### Mode Suggestions

The system infers modes from your intent:

- **Dark mode**: "night", "late", "dark theme"
- **Do Not Disturb**: "meeting", "presentation", "no interruptions"

Example: "meeting prep with calendar and notes" → Calendar + Notes with DND enabled.

## System Modes

Use the top bar to toggle modes:

- **DND** – Shows a Do Not Disturb indicator; use during meetings or presentations
- **Dark / Light** – Toggles dark theme

## Layout Strategies

When you have a workspace open, use the Layout button in the top bar to switch arrangement:

- **Floating** – Free placement; drag windows anywhere
- **Grid** – Apps arranged in a grid (3 columns)
- **Split** – Binary divisions; side-by-side or stacked
- **Tiled** – Automatic tiling to maximize space

## Window Management

- **Drag** – Click and drag the title bar to move windows
- **Resize** – Drag the edges or corners of a window
- **Snap to grid** – Enable in the Layout menu for 10px alignment when releasing a drag
- **Magnetic edges** – Windows snap to align with nearby windows (within 5px)
- **Minimize** – Click the minus icon to minimize a window to the taskbar
- **Close** – Click the X to remove an app from the workspace

## Workspace Management

- **Create** – Click "New" or describe an intent on the home screen
- **Switch** – Click workspace tabs in the top bar
- **Rename** – Click the pencil icon next to a workspace name
- **Favorite** – Click the star to pin a workspace; favorites appear first
- **Delete** – Click the trash icon to remove a workspace

Workspaces are ordered by: favorites first, then most recently accessed.

## Taskbar

The bottom taskbar shows pinned apps and an "All apps" button:

- Click an app to add it to the current workspace (or restore if minimized)
- Click "All apps" to search and add any of the 12 available apps

## Available Apps

| App               | Purpose                          |
|-------------------|----------------------------------|
| Notes             | Writing, documentation           |
| Timer             | Pomodoro, countdown              |
| Todo              | Task tracking                    |
| Code Editor       | Programming, editing code        |
| Quiz              | Flashcards, study                |
| Email             | Composing emails                 |
| Chat              | Quick messaging                  |
| Calendar          | Scheduling, events               |
| File Browser      | File navigation                  |
| Whiteboard        | Brainstorming, diagrams          |
| AI Chat           | AI assistance                    |
| Explanation Panel | Contextual help                  |

## Data Storage

- Workspace configurations and preferences are stored in your browser (localStorage).
- File contents (notes, code, tasks, etc.) are stored in IndexedDB.
- All data stays in your browser; nothing is sent to a server except the intent string for AI parsing.
