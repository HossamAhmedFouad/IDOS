# IDOS - Intent-Driven OS

An Intent-Driven Operating System built as a web application. Describe what you want to do in natural language, and IDOS creates a workspace with the right apps and layout.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **Zustand** - State management with localStorage persistence
- **Tailwind CSS 4** - Styling
- **TypeScript** - Type safety
- **IndexedDB** - Browser-based file storage
- **Gemini API** - Intent parsing

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey). Alternatively, use `GOOGLE_GENERATIVE_AI_API_KEY` if you prefer.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Try it out

Type an intent in the search bar, for example:

- "Take notes and set a 25 min timer"
- "I need a todo list and dark mode"
- "Write an email draft"

IDOS will create a workspace with the appropriate apps.

## Architecture

- **Workspace** - Layout configuration (apps, positions, modes, layout strategy)
- **App Registry** - Maps app IDs to components (Notes, Timer, Todo, Email, AI Chat, etc.)
- **File System** - IndexedDB-backed virtual file system (Unix-style paths)
- **Layout Engine** - Computes pixel positions (floating layout in Phase 1)
- **Intent API** - POST `/api/parse-intent` with `{ intent: string }` to get workspace config

## Project Structure

```
src/
├── app/           # Next.js App Router
├── apps/          # App registry + individual apps (notes, timer, todo, etc.)
├── components/    # Shared UI (AppWindow with drag/resize)
├── features/      # Workspace view, intent input, layout engine
├── lib/           # Types, constants, file system API
└── store/         # Zustand stores (workspace)
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Documentation/Intent_Driven_OS_Frontend_Architecture.pdf](Documentation/Intent_Driven_OS_Frontend_Architecture.pdf)
