# AI providers

## Supported providers

| Id | Provider | Adapter | SDK (pinned) | Key variable | Verified |
|---|---|---|---|---|---|
| `gemini` | Google Gemini (Developer API, AI Studio key) | `providers/gemini.js` | `@google/genai` 3.3.0 | `GEMINI_API_KEY` | Live on the free tier (2026-11-16) |
| `nvidia` | NVIDIA build.nvidia.com (OpenAI-compatible) | `providers/openaiCompatible.js` | `openai` 7.57.0 | `NVIDIA_API_KEY` (`NVIDIA_BASE_URL` optional) | Live on the free tier (2026-11-16) |
| `openai` | OpenAI Chat Completions | `providers/openaiCompatible.js` | `openai` 7.57.0 | `OPENAI_API_KEY` (`OPENAI_BASE_URL` optional) | Mocked SDK only, never called |
| `anthropic` | Anthropic Claude Messages API | `providers/anthropic.js` | `@anthropic-ai/sdk` 1.8.0 | `ANTHROPIC_API_KEY` | Mocked SDK only; by the owner's choice no Claude key and no calls |

A provider can be chosen on the admin page only when its key is set on the server.

## The adapter contract

Every adapter returns an object with:

| Member | Does |
|---|---|
| `stream(req)` | Async iterator: `{ type: "delta", text }` …, then `{ type: "done", usage: { inputTokens, outputTokens }, finishReason }` |
| `generate(req)` | `{ text, usage, finishReason }` without streaming |
| `validateConfig()` | `{ ok, problems }` |
| `checkModel(model)` | Free check that the model exists (lists or reads models) |
| `normalizeError(err)` | `AssistantProviderError` |

`req` is `{ model, system, messages: [{ role: "user"|"assistant", content }], maxOutputTokens,
temperature, signal }`. `finishReason` is `stop`, `length` or `content_filtered`. Nothing from an
SDK leaves its adapter.

## Errors (`providers/errors.js`)

| Code | From | Retryable | May have been processed |
|---|---|---|---|
| `auth` | 401, 403; Gemini's 400 "API key not valid" | no | no |
| `not_configured` | no key on the server | no | no |
| `model_not_found` | 404 | no | no |
| `rate_limited` | 429 | yes | no |
| `timeout` | 408, 504, SDK timeout, our deadline | yes | **yes** |
| `unavailable` | 5xx, 529, network failure | yes | no (yes after text started) |
| `bad_request` | 400, 413, 422 | no | no |
| `content_filtered` | safety block, refusal | no | n/a |
| `aborted` | the user pressed Stop or left | no | n/a |

Users see a plain message per code (in English and Nepali in the widget), never the provider's
own text.

## Fallback rule (`providerManager.js`)

Off by default. When an administrator turns it on, the fallback provider is tried **once**, and
only if:
- the main provider failed **before any text** was sent;
- the error says the request was **not processed**;
- the code is not `timeout`, `content_filtered` or `aborted`;
- the fallback provider's key is installed.

Every failure and fallback decision is logged as one line (provider, model, code, status), never
with the prompt.

## Models (`providers/models.js`)

The admin page offers a menu per provider and accepts any other model id ("Another model id…").
Use **Test connection** to check one.

| Provider | In the menu | Notes |
|---|---|---|
| Gemini | `gemini-3.5-flash-lite` (default), `gemini-3.5-flash`, `gemini-3.1-flash-lite` | `gemini-2.5-flash` is closed to new users. Flash thinks first: 1,024 extra output tokens allowed |
| NVIDIA | `nvidia/nemotron-3.5-lightning-30b-a3b`, `mistralai/mistral-large-4-1t-a52b` | Many catalog models return 404 for a free account. Nemotron reasons before answering (2,500 extra tokens); with reasoning switched off its Nepali was garbled, so it stays on |
| OpenAI | `gpt-6-luna`, `gpt-6.1-terra`, `gpt-6.1-sol` | From OpenAI's pricing page; `max_completion_tokens`, no temperature |
| Anthropic | `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5` | Current Claude models reject `temperature`; depth is set with `output_config.effort: "low"`. Opus and Sonnet 5.5 use server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`) |

Prices in the file feed only the usage page's cost estimate. A free tier has no price, so it is
not estimated.

## Measured on 2026-11-16 (free tiers)

| | Gemini 3.5 Flash-Lite | NVIDIA Nemotron 3.5 Lightning |
|---|---|---|
| Time to first text | about 1 s | 10–12 s (it reasons first) |
| Nepali | Good, keeps English labels | Understandable, with Hindi words; once answered a Nepali question in English |
| Evaluation set (36 questions) | 34/36 (both misses transient "unavailable") | 9/10 of the first 10 |

## Adding a provider

1. Write `providers/<name>.js` with the contract above; keep its SDK inside the file.
2. Register it in `providers/index.js` (label, key variable, data-handling note, `build`).
3. Add its id to `PROVIDER_IDS` in `utils/assistantConfig.js` and its models to `models.js`.
4. Add a mocked-SDK test to `services/__tests__/assistant.providers.test.js` (streaming, usage,
   every error code).
5. Run `node scripts/assistant-smoke.js --provider <name>` with a real key before saying it works.
