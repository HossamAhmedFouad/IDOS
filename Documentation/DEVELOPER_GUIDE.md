# Intent-Driven OS Developer Guide

This guide explains how to extend the Intent-Driven OS with new apps, layout strategies, and system modes.

## Adding a New Application

### 1. Create the app component

Create a folder under `src/apps/<app-id>/` with an `index.tsx` that exports the app component.

Example structure:

```tsx
// src/apps/my-app/index.tsx
"use client";

import type { AppProps } from "@/lib/types";

export function MyAppApp({ config, activeModes }: AppProps) {
  return <div>My App Content</div>;
}
```

### 2. Add to app catalog

Edit `src/lib/constants/app-catalog.ts`:

```ts
{ id: "my-app", name: "My App" }
```

### 3. Add default sizes

Edit `src/lib/constants/app-defaults.ts`:

```ts
"my-app": { width: 400, height: 350 }
```

### 4. Add icon

Edit `src/lib/constants/app-icons.tsx` to map `my-app` to an icon component.

### 5. Register the component

Edit `src/apps/registry.tsx`:

- Add the lazy import: `lazy(() => import("./my-app").then((m) => ({ default: m.MyAppApp })))`
- Add to `APP_COMPONENTS`: `"my-app": lazy(...)`

### 6. Update intent parser

Edit `src/app/api/parse-intent/route.ts`:

- Add `"my-app"` to `VALID_APP_TYPES`
- Add mapping rules in the system prompt for when to suggest this app

## Adding a Layout Strategy

### 1. Implement in layout engine

Edit `src/features/workspace/layout-engine.ts`:

- Add a case in `computeLayout` for your strategy (e.g. `"custom"`)
- Implement a function that takes `(apps, viewportWidth, viewportHeight)` and returns `{ apps: AppInstance[] }` with computed positions

### 2. Update types

Add your strategy to `LayoutStrategy` in `src/lib/types/layout.ts`:

```ts
export type LayoutStrategy = "floating" | "grid" | "split" | "tiled" | "custom";
```

### 3. Update intent parser

Add the new strategy to `VALID_LAYOUTS` and the system prompt in the parse-intent route.

### 4. Add to layout switcher UI

The layout popover in `src/features/workspace/workspace-view.tsx` uses the `LayoutStrategy` type, so it will pick up the new option automatically.

## Adding a System Mode

### 1. Update mode type

Edit `src/lib/types/modes.ts`:

```ts
export type SystemMode = "focus" | "dark" | "dnd" | "my-mode";
```

### 2. Apply in ModeProvider

Edit `src/features/workspace/mode-provider.tsx` to set a `data-my-mode` attribute or class when the mode is active.

### 3. Add CSS (if visual)

Edit `src/app/globals.css` to style elements when `[data-my-mode="true"]` is present.

### 4. Add toggle UI

Add a toggle button in the workspace-view top bar (alongside Focus, DND, Dark).

### 5. Update intent parser

Add to `VALID_MODES` and the mode inference rules in the parse-intent system prompt.

## File System API

Apps that need to persist data use the file system API in `src/lib/file-system/`:

- `readFile(path)` – Read file contents
- `writeFile(path, content)` – Save file
- `listDirectory(path)` – List directory contents
- `deleteFile(path)` – Delete file
- `moveFile(oldPath, newPath)` – Move/rename
- `getMetadata(path)` – Get file metadata

Paths use Unix-style format (e.g. `/notes/draft.txt`).

## State Management

- **Workspace state**: Zustand store in `src/store/use-workspace-store.ts`
- **File system**: IndexedDB via `src/lib/file-system/idb-adapter.ts`
- **UI state**: Local component state (e.g. dropdown open/closed)
