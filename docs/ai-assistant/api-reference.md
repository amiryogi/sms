# API reference: `/api/v1/assistant`

All endpoints need `Authorization: Bearer <access token>`. Responses use the app's envelope
`{ success, message, data }`; errors are `{ success: false, message, errors?, code? }`.

## For every role (when the school allows it)

### `GET /bootstrap`

What the widget needs. Never fails for a signed-in user.

```json
{ "enabled": true, "reason": null, "defaultLanguage": "auto", "autoDetect": true,
  "maxQuestionLength": 1000, "dailyLimit": 50,
  "suggestions": [{ "en": "How do I take attendance?", "ne": "हाजिरी कसरी लिने?" }],
  "guides": [{ "id": "teacher.attendance", "module": "attendance", "route": "/teacher/attendance",
               "title": { "en": "Take the attendance register", "ne": "हाजिरी लिने" } }] }
```

`reason` when off: `disabled_on_server`, `disabled_by_school`, `role_not_allowed`,
`not_configured`.

### `POST /chat/stream`

Body: `{ "message": "1–1000 characters", "conversationId"?: 12, "language"?: "auto"|"en"|"ne",
"context"?: { "route": "/teacher/attendance" } }`.

Refusals come back before streaming, as JSON:

| Status | When |
|---|---|
| 400 | Invalid body |
| 403 | `code: ASSISTANT_UNAVAILABLE` (switched off, role not allowed, no provider key) |
| 404 | Not your conversation |
| 429 | Rate limit, or `code: ASSISTANT_DAILY_LIMIT` / `ASSISTANT_MONTHLY_BUDGET` |

Otherwise `200 text/event-stream`:

| Event | Data |
|---|---|
| `meta` | `{ conversationId, userMessageId, language, context, sources: [{ id, title }], guides: [...] }` |
| `delta` | `{ text }`, many times |
| `done` | `{ messageId, provider, fellBack, truncated, usage: { inputTokens, outputTokens } }` |
| `error` | `{ code, message, messageId? }`: provider codes as in provider-integration.md, plain message |

Lines starting with `:` are padding and keep-alive comments.

### `POST /chat`

Same body and refusals; the whole answer in one response:
`{ ...meta, answer, messageId, provider, fellBack, usage }`, or `{ ...meta, answer, error }`
when the provider failed.

### Conversations (own only)

| Method and path | Returns |
|---|---|
| `GET /conversations?page&limit` | Paginated `[{ id, title, language, createdAt, lastMessageAt, messageCount }]`, newest first |
| `GET /conversations/:id` | `{ id, title, language, messages: [{ id, role, content, language, sources, guides, feedback, createdAt }] }` |
| `DELETE /conversations/:id` | 200, or 404 if not yours |
| `DELETE /conversations` | `{ deleted }`, all of yours |
| `POST /messages/:id/feedback` | Body `{ value: -1|0|1, comment? }` (comment up to 500, seen by admins); 404 if not your answer |

## Administrators (`isAdmin`: ADMIN and SUPER_ADMIN), own school only

| Method and path | Body / query | Returns |
|---|---|---|
| `GET /admin/settings` | | `{ settings, providers: [{ id, label, keyConfigured, envKey, dataNote, models }], serverEnabled, fakeProvider }` |
| `PUT /admin/settings` | Any subset of the settings below | The saved settings; 400 with `errors: [{ field, message }]` |
| `POST /admin/test-provider` | `{ provider, model }` | `{ ok, latencyMs, sample }` or `{ ok: false, error: { code, message } }` |
| `GET /admin/usage` | `?from=YYYY-MM-DD&to=YYYY-MM-DD` (Nepal dates, default the last 30 days, at most 366) | `{ totals, byDay, byRole, byLanguage, byProvider, errorsByCode, comments }` |

### Settings (`utils/assistantConfig.js`)

| Field | Default | Allowed |
|---|---|---|
| `enabled` | `true` | boolean |
| `roles` | all seven | role names |
| `provider`, `model` | `gemini`, `gemini-3.5-flash-lite` | installed providers; model id |
| `fallback` | `{ enabled: false, provider: "nvidia", model: "nvidia/nemotron-3.5-lightning-30b-a3b" }` | must differ from the main one |
| `timeoutMs` | 45000 | 5000–120000 |
| `maxOutputTokens` | 1200 | 200–8000 |
| `temperature` | 0.3 | 0–1 (ignored where a model rejects it) |
| `defaultLanguage`, `autoDetect` | `auto`, `true` | `auto`/`en`/`ne`; boolean |
| `retentionDays` | 90 | 1–730 |
| `userDailyLimit` | 50 | 1–1000 |
| `monthlyTokenBudget` | 2000000 | 0 (no limit) – 1e9 |

## Rate limits

`/chat`, `/chat/stream` and `/admin/test-provider` share a per-user limit of 20 requests per
5 minutes (`ASSISTANT_RATE_LIMIT`).
