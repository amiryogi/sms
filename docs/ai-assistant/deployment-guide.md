# Deploying the help assistant

Follows [docs/deployment.md](../deployment.md): frontend on Vercel, backend on the cPanel
Node.js app (Passenger), database on Supabase or MySQL.

## 1. Get a key

| Provider | Where | Cost |
|---|---|---|
| Gemini (recommended main) | https://aistudio.google.com/apikey | Free tier with daily limits; prompts may improve Google's products. A paid key for production use |
| NVIDIA (recommended fallback) | https://build.nvidia.com/settings/api-keys | Free, about 40 requests a minute; for development and testing per NVIDIA's terms |
| OpenAI / Anthropic | their consoles | Paid per token |

## 2. Server

1. Upload the backend as usual, then in the app folder: `npm install` (new packages:
   `@google/genai`, `openai`, `@anthropic-ai/sdk`).
2. Apply the migration: `npm run db:migrate:deploy` (`20261116100000_ai_assistant`: one nullable
   column on `schools` and three new tables; existing rows untouched).
3. Add to `backend/.env` (keep `chmod 600`):
   ```
   GEMINI_API_KEY=...
   NVIDIA_API_KEY=...
   ASSISTANT_ENABLED=true
   ASSISTANT_RATE_LIMIT=20
   ```
   Keep `NODE_ENV=production`: it disables the test-only fake provider.
4. Setup Node.js App → **Restart**.

## 3. Frontend

Deploy as usual (Vercel builds from `main`). No new environment variables.

## 4. Switch it on for the school

Sign in as an administrator → Settings → **AI Assistant**:
1. **AI provider:** Google Gemini, Gemini 3.5 Flash-Lite → **Test connection**.
2. Turn on the fallback (NVIDIA, Nemotron 3.5 Lightning) → **Test connection**.
3. **Assistant:** check roles, language and limits → **Save settings**.

## 5. Check streaming through cPanel

Passenger (and Apache or LiteSpeed in front of it) may buffer responses. The server sends
`X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform` and a 2 KB opening comment to
discourage buffering. Check from any machine:

```bash
TOKEN=...   # an access token from signing in
curl -N -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"message":"How do I take attendance?","language":"en"}' \
  https://<api-host>/api/v1/assistant/chat/stream
```

- Text should appear in pieces. If it appears all at once at the end, the host is buffering:
  answers still arrive, just not word by word.
- If the host turns the stream into an error page (502/503/504), the browser falls back to
  `POST /assistant/chat` by itself.
- Not yet checked on the production host: do this after the first deploy.

## 6. Turning it off

- One school: AI Assistant → **Help assistant is on** off.
- The whole server: `ASSISTANT_ENABLED=false` and restart.
- Removing a key also stops that provider (it can no longer be selected).

## Rollback

The assistant is additive. To remove it from a deployment, deploy the previous build; the new
tables and column can stay. They are unused without the code.
