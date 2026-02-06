# Parse Intent API

The parse-intent API converts natural language intent into a structured workspace configuration for the Intent-Driven OS.

## Endpoint

`POST /api/parse-intent`

## Request

### Headers

- `Content-Type: application/json`

### Body

| Field   | Type   | Required | Description                        |
|---------|--------|----------|------------------------------------|
| intent  | string | Yes      | Natural language description of the desired workspace |

### Example

```json
{
  "intent": "take notes and set a 25 minute timer for deep work"
}
```

## Response

### Success (200)

```json
{
  "workspace": {
    "apps": [
      {
        "id": "app-notes-1",
        "type": "notes",
        "x": 50,
        "y": 50,
        "width": 400,
        "height": 350,
        "config": { "filePath": "/notes/note.txt" }
      },
      {
        "id": "app-timer-2",
        "type": "timer",
        "x": 80,
        "y": 80,
        "width": 320,
        "height": 280
      }
    ],
    "layoutStrategy": "floating",
    "modes": ["focus"]
  }
}
```

### Response Fields

| Field           | Type     | Description                                                    |
|-----------------|----------|----------------------------------------------------------------|
| workspace       | object   | The parsed workspace configuration                             |
| workspace.apps  | array    | List of application instances to display                       |
| workspace.layoutStrategy | string | One of: `floating`, `grid`, `split`, `tiled`          |
| workspace.modes | array    | Active system modes: `focus`, `dark`, `dnd`                    |

### App Instance

| Field   | Type   | Description                                |
|---------|--------|--------------------------------------------|
| id      | string | Unique identifier for the app instance     |
| type    | string | App type (see valid types below)           |
| x       | number | X position in pixels                       |
| y       | number | Y position in pixels                       |
| width   | number | Width in pixels                            |
| height  | number | Height in pixels                           |
| config  | object | Optional app-specific config (e.g. filePath) |

### Valid App Types

`notes`, `timer`, `todo`, `code-editor`, `quiz`, `email`, `chat`, `calendar`, `file-browser`, `whiteboard`, `ai-chat`, `explanation-panel`

### Error Responses

#### 400 Bad Request

```json
{
  "error": "Missing or invalid intent string"
}
```

#### 500 Internal Server Error

```json
{
  "error": "GEMINI_API_KEY is not configured"
}
```

```json
{
  "error": "No response from AI"
}
```

## Environment

Requires `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` to be set for AI parsing.
