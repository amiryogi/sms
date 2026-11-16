# Architecture

## Overview

```
Browser (DashboardLayout)                        Server (/api/v1/assistant)                 AI provider
┌────────────────────────────┐   POST /chat/stream ┌─────────────────────────────────┐   HTTPS   ┌──────────┐
│ AssistantDock              │ ──────────────────▶ │ authenticate → assistantLimiter │ ────────▶ │ Gemini   │
│  ├ AssistantWidget (chat)  │ ◀── SSE events ──── │ → validate → controller         │ ◀─ text ─ │ NVIDIA   │
│  └ GuideRunner (driver.js) │                     │ → services/assistant            │           │ OpenAI   │
└────────────────────────────┘                     └─────────────────────────────────┘           │ Claude   │
                                                        │ ai_conversations, ai_messages,          └──────────┘
                                                        │ ai_usage_events, schools.assistant_config
```

## Backend (`backend/src/services/assistant/`)

| File | Job |
|---|---|
| `index.js` | `bootstrap`, `startChat` (every refusal happens here, before streaming), `runChat` (streams events, saves the answer and usage) |
| `knowledge.js` | Loads `data/assistant/knowledge/**/*.md`, filters by role, BM25 search with a Nepali synonym map |
| `routeCatalog.js` | The app's pages and who may open them; turns the browser's path into a checked page context |
| `languageResolver.js` | English or Nepali for this answer |
| `promptBuilder.js` | System prompt, fenced documents, trimmed history, masked personal details |
| `providerManager.js` | Picks the provider, applies the timeout, one pre-stream fallback, test connection |
| `providers/` | One adapter per provider (`gemini`, `openaiCompatible` for OpenAI and NVIDIA, `anthropic`, `fake`), shared errors and model list |
| `usage.js` | Usage events, daily limit, monthly budget, monitoring summary |
| `retention.js` | Deletes old conversations, at most once an hour per school |

Settings: `utils/assistantConfig.js` normalizes and validates `schools.assistant_config`.
Help data: `data/assistant/` (`knowledge/`, `guides.json`, `suggestions.json`, `evals.json`).
HTTP: `routes/assistant.routes.js`, `controllers/assistant.controller.js`,
`validators/assistant.validators.js`, `utils/sse.js`, `assistantLimiter` in
`middleware/rateLimit.middleware.js`.

## One question, step by step

1. **Browser:** the widget sends `{ message, conversationId?, language?, context: { route } }`
   to `POST /assistant/chat/stream` with the access token (`api/assistantStream.js`).
2. **Middleware:** `authenticate` (user, roles, school from the token), `assistantLimiter`
   (per user), express-validator rules.
3. **`startChat`:**
   - checks the assistant is on (server and school) and the user's role is allowed;
   - checks the conversation is the user's own, the daily limit and the monthly budget;
   - resolves the language and checks the page path against the user's roles;
   - retrieves up to 3 help documents for those roles;
   - picks the walkthroughs from the documents' `guides` field, filtered by role;
   - loads the last turns, builds the prompt, and saves the question.
4. **`runChat`:** sends `meta` (conversation, language, sources, walkthroughs), then streams
   `delta` events from `providerManager.streamAnswer`, then saves the answer and a usage event
   and sends `done`. On failure it saves any partial text, records the error and sends `error`.
5. **Browser:** renders Markdown safely, shows sources, feedback and walkthrough buttons. If the
   network cannot stream, it calls `POST /assistant/chat` for the whole answer instead.

## Frontend (`frontend/src/components/assistant/`)

| File | Job |
|---|---|
| `AssistantDock.jsx` | Mounted by `DashboardLayout`; joins the widget and the walkthrough runner |
| `AssistantWidget.jsx` | Help button, panel, language switch, suggestions, history view |
| `useAssistantChat.js` | Send, stream, fallback, stop, retry, reset, open, rate |
| `ChatMessage.jsx`, `AssistantMarkdown.jsx`, `ChatInput.jsx`, `HistoryList.jsx` | The pieces of the panel |
| `strings.js` | The widget's own text in English and Nepali |
| `guides/registry.js`, `guides/GuideRunner.jsx`, `guides/targets.js` | Walkthroughs |

Also `api/assistantService.js` (axios), `api/assistantStream.js` (fetch + SSE parser),
`lib/assistantPrefs.js` (language per browser, open conversation per tab) and
`pages/admin/AssistantSettings.jsx`.

## Data

| Table | Holds | Kept |
|---|---|---|
| `schools.assistant_config` | The school's settings (JSON, never a key) | Until changed |
| `ai_conversations` | One per chat thread, owner and school | `retentionDays` after the last message |
| `ai_messages` | Questions and answers, sources and walkthroughs offered | With their conversation |
| `ai_usage_events` | Provider, model, tokens, time, status, error code, feedback; no text | Not deleted (monitoring) |

## Design decisions

- **No personal data:** answers come from help documents only, so no student, mark or fee
  record ever reaches a provider. This also makes the parent-child and teacher-class rules
  impossible to bypass through the assistant.
- **Files, not a vector database:** about 40 short documents; BM25 with role filtering is fast,
  explainable and needs no extra service.
- **Walkthroughs are deterministic:** the server offers them from document metadata; the model
  never picks a guide or a screen element.
- **One pre-stream fallback:** a second provider only when the first failed before any text and
  the request was not processed, so a school is never billed twice for one question.
