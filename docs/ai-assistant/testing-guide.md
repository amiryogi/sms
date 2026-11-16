# Testing the help assistant

None of the routine tests calls an AI provider or needs a key.

| Suite | Command | Covers |
|---|---|---|
| Backend unit | `cd backend && npm test` | Adapters against mocked SDKs (streaming, usage, every error code, Gemini's bad-key 400), fallback rules, timeout and abort, language detection, retrieval per role (with English, Nepali and romanized questions), prompt fencing and redaction, settings validation, drift against `App.jsx` and `navigation.js` |
| Backend integration | `npm run test:integration:mysql` / `:pg` | `src/__integration__/assistant.test.js` over HTTP with a recording provider: access per role, page context, Nepali, redaction, ownership (404), school isolation, feedback, admin-only settings, no key in responses, daily limit, monthly budget, per-user rate limit, provider error and fallback, usage, retention, SSE format |
| Frontend unit | `cd frontend && npm test` | SSE parser (Nepali split across chunks, CRLF, partial events), preferences, widget text parity, safe Markdown, walkthrough registry against the server catalog, `App.jsx`, each role's menu and the tagged controls, target pattern |
| Browser | `cd e2e && PW_CHANNEL=chrome npm test` | `tests/assistant.spec.js`: chat, Nepali, provider error, the attendance walkthrough (menu, page, missing control, back, pause across a reload, resume, exit), phone layout, student scope, admin page, student refused, nothing on the public site |

The browser suite starts the backend with `ASSISTANT_FAKE_PROVIDER=true`: canned answers
(Nepali when the prompt asks for Nepali), streamed in pieces. A question containing
`[fail:rate_limited]` (or another code) fails with that code, and `[slow]` waits 2 s.

## Live check (by hand, real keys)

```bash
cd backend
node scripts/assistant-smoke.js --provider gemini            # 8 checks + 36 evaluation questions
node scripts/assistant-smoke.js --provider nvidia --evals 10 --delay 2000
node scripts/assistant-smoke.js --provider anthropic --allow-paid   # paid: refused without the flag
```

The checks:
1. key installed;
2. model listed;
3. a Nepali answer streams, is in Nepali and keeps "Save Attendance" in English;
4. usage is reported;
5. English without streaming;
6. a wrong key is reported as `auth`.

The evaluation set (`src/data/assistant/evals.json`) checks language, labels that must or must
not appear, and that the expected document was found. Its answers go to a Markdown report for a
person to read.

### Results on 2026-11-16

| Provider | Smoke | Evaluation |
|---|---|---|
| Gemini 3.5 Flash-Lite | 8/8 | 34/36 with the final prompt; both misses were free-tier "unavailable" errors (the smoke script calls the provider directly, without the fallback) |
| NVIDIA Nemotron 3.5 Lightning | 8/8 | 9/10; one Nepali question answered in English |
| OpenAI, Anthropic | not run (no keys; Anthropic by the owner's choice) | not run |

## Adding a case

- A new help document: add a retrieval case to `assistant.knowledge.test.js` and a question to
  `evals.json`.
- A new walkthrough: the registry tests run automatically; add a browser case for anything
  unusual.
- A new provider: a mocked-SDK block in `assistant.providers.test.js`, then a live smoke run.
