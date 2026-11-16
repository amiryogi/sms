/**
 * Picks the provider for a request, enforces the timeout, and applies the fallback rule.
 *
 * Fallback (off unless an administrator turns it on):
 *  - at most one other provider/model, and only one whose key is installed;
 *  - only when the first one failed before sending any text, with an error that means the
 *    request was not processed (auth, rate limit, unavailable, model not found, bad request).
 *    A timeout or an error after text started may already have been run and billed, so it is
 *    never sent again; a refusal is never routed around; a user's "stop" is never retried.
 *  - every failure and fallback decision is logged without the prompt.
 *
 * Tests replace the providers with `setTestProvider(factory)`. With ASSISTANT_FAKE_PROVIDER=true
 * (refused in production) every provider is the canned one in ./providers/fake.js.
 */
const { PROVIDERS, apiKeyFor, keyConfigured } = require("./providers");
const { createFakeProvider } = require("./providers/fake");
const { AssistantProviderError, CODES } = require("./providers/errors");

let testFactory = null;
/** @param {null | ((providerId: string) => object)} factory */
const setTestProvider = (factory) => {
  testFactory = factory;
};

const fakeMode = () => process.env.NODE_ENV !== "production" && process.env.ASSISTANT_FAKE_PROVIDER === "true";

/** Whether a provider can be used on this server. */
const isUsable = (providerId) => !!PROVIDERS[providerId] && (testFactory !== null || fakeMode() || keyConfigured(providerId));

const cache = new Map(); // providerId -> { key, provider }
/** Build (or reuse) a provider. Throws not_configured when its key is missing. */
function getProvider(providerId) {
  if (testFactory) return testFactory(providerId);
  if (fakeMode()) return createFakeProvider({ id: providerId });
  const def = PROVIDERS[providerId];
  const key = apiKeyFor(providerId);
  if (!def || !key) {
    throw new AssistantProviderError(CODES.NOT_CONFIGURED, `No API key installed for ${providerId}`, { provider: providerId });
  }
  const hit = cache.get(providerId);
  if (hit && hit.key === key) return hit.provider;
  const provider = def.build(key);
  cache.set(providerId, { key, provider });
  return provider;
}

/** The ordered targets for one request: the main provider, then the fallback if allowed. */
function targetsFor(settings) {
  const main = { provider: settings.provider, model: settings.model };
  const list = [main];
  const fb = settings.fallback;
  if (fb?.enabled && isUsable(fb.provider) && !(fb.provider === main.provider && fb.model === main.model)) {
    list.push({ provider: fb.provider, model: fb.model });
  }
  return list;
}

const NO_FALLBACK = new Set([CODES.ABORTED, CODES.CONTENT_FILTERED, CODES.TIMEOUT]);
const mayFallBack = (err, sentText) => !sentText && !err.mayHaveProcessed && !NO_FALLBACK.has(err.code);

/** An AbortSignal that fires on the caller's signal or after `ms`, and says which. */
function deadline(outer, ms) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const onAbort = () => controller.abort();
  if (outer?.aborted) controller.abort();
  else outer?.addEventListener?.("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    clear: () => {
      clearTimeout(timer);
      outer?.removeEventListener?.("abort", onAbort);
    },
  };
}

const log = (msg) => {
  if (process.env.NODE_ENV !== "test") console.warn(`[assistant] ${msg}`);
};

/**
 * Stream an answer. Yields:
 *   { type: "attempt", provider, model, fellBack }   before each try
 *   { type: "delta", text }
 *   { type: "done", usage, finishReason, provider, model, fellBack, latencyMs }
 * Throws AssistantProviderError (with .provider, .model, .fellBack, .sentText set) when every
 * allowed target failed.
 *
 * @param {object} settings  normalized school settings (utils/assistantConfig.js)
 * @param {object} request   { system, messages, maxOutputTokens, temperature }
 * @param {object} [opts]    { signal }
 */
async function* streamAnswer(settings, request, { signal } = {}) {
  const targets = targetsFor(settings);
  let lastError = null;

  for (let i = 0; i < targets.length; i++) {
    const { provider: providerId, model } = targets[i];
    const fellBack = i > 0;
    const started = Date.now();
    const limit = deadline(signal, settings.timeoutMs);
    let sentText = false;
    yield { type: "attempt", provider: providerId, model, fellBack };

    try {
      const provider = getProvider(providerId);
      for await (const event of provider.stream({ ...request, model, signal: limit.signal })) {
        if (event.type === "delta") {
          sentText = true;
          yield event;
        } else if (event.type === "done") {
          if (!sentText && event.finishReason === "content_filtered") {
            throw new AssistantProviderError(CODES.CONTENT_FILTERED, `${providerId} declined to answer`, { provider: providerId });
          }
          yield { ...event, provider: providerId, model, fellBack, latencyMs: Date.now() - started };
          return;
        }
      }
      throw new AssistantProviderError(CODES.UNKNOWN, `${providerId} stream ended without finishing`, { provider: providerId, mayHaveProcessed: true });
    } catch (raw) {
      let err = raw instanceof AssistantProviderError ? raw : new AssistantProviderError(CODES.UNKNOWN, raw?.message || "error", { provider: providerId, cause: raw });
      // Our own deadline fired: a timeout, which the provider may still be processing.
      if (limit.timedOut()) {
        err = new AssistantProviderError(CODES.TIMEOUT, `${providerId} did not finish within ${settings.timeoutMs} ms`, { provider: providerId, mayHaveProcessed: true });
      }
      Object.assign(err, { provider: providerId, model, fellBack, sentText, latencyMs: Date.now() - started });
      lastError = err;
      const next = targets[i + 1];
      const fallBack = next && mayFallBack(err, sentText);
      if (err.code !== CODES.ABORTED) {
        log(`provider=${providerId} model=${model} error=${err.code}${err.status ? ` status=${err.status}` : ""} sentText=${sentText}` + (next ? ` fallback=${fallBack ? next.provider : "no"}` : ""));
      }
      if (!fallBack) throw err;
    } finally {
      limit.clear();
    }
  }
  throw lastError || new AssistantProviderError(CODES.NOT_CONFIGURED, "No provider", {});
}

/**
 * One short request to check a key and model ("Test connection" on the admin page).
 * Checks the model is listed (free), then asks for one word.
 */
async function testConnection({ provider: providerId, model, timeoutMs = 20000 }) {
  const started = Date.now();
  const limit = deadline(null, timeoutMs);
  try {
    const provider = getProvider(providerId);
    await provider.checkModel(model, { signal: limit.signal });
    const res = await provider.generate({
      model,
      system: "You are a connection test. Reply with the single word OK.",
      messages: [{ role: "user", content: "Reply with OK." }],
      maxOutputTokens: 200,
      temperature: 0,
      signal: limit.signal,
    });
    return { ok: true, latencyMs: Date.now() - started, sample: String(res.text || "").trim().slice(0, 40), usage: res.usage };
  } catch (raw) {
    const err = limit.timedOut()
      ? new AssistantProviderError(CODES.TIMEOUT, "test timed out", { provider: providerId })
      : raw instanceof AssistantProviderError
        ? raw
        : new AssistantProviderError(CODES.UNKNOWN, raw?.message || "error", { provider: providerId });
    log(`test provider=${providerId} model=${model} error=${err.code}`);
    return { ok: false, latencyMs: Date.now() - started, error: { code: err.code, message: err.userMessage } };
  } finally {
    limit.clear();
  }
}

module.exports = { streamAnswer, testConnection, getProvider, isUsable, targetsFor, setTestProvider, fakeMode, mayFallBack };
