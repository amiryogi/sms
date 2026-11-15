/**
 * Adapter for Google's Gemini API (@google/genai, the Gemini Developer API with an AI Studio
 * key). Same contract as ./openaiCompatible.js.
 */
const { GoogleGenAI, ApiError } = require("@google/genai");
const { AssistantProviderError, CODES, codeForStatus, isAbortError, toProviderError } = require("./errors");
const { modelSpec } = require("./models");

const FILTERED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"]);
const finishOf = (reason) => {
  if (!reason) return "stop";
  if (reason === "MAX_TOKENS") return "length";
  if (FILTERED.has(reason)) return "content_filtered";
  return "stop";
};

/** Answer text of one chunk, without "thought" parts. */
const textOf = (response) =>
  (response?.candidates?.[0]?.content?.parts || [])
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("");

/** Thinking is billed as output. */
const usageOf = (u) => ({
  inputTokens: u?.promptTokenCount || 0,
  outputTokens: (u?.candidatesTokenCount || 0) + (u?.thoughtsTokenCount || 0),
});

/**
 * @param {object} opts
 * @param {string} [opts.apiKey]
 * @param {object} [opts.client]  a GoogleGenAI instance (tests pass a fake)
 */
function createGeminiProvider({ apiKey, client } = {}) {
  const id = "gemini";
  const ai = client || new GoogleGenAI({ apiKey });

  const normalizeError = (err) => {
    if (err instanceof AssistantProviderError) return err;
    if (isAbortError(err)) return new AssistantProviderError(CODES.ABORTED, "Request aborted", { provider: id, cause: err });
    if (err instanceof ApiError || typeof err?.status === "number") {
      // Google answers a wrong key with 400 "API key not valid" (API_KEY_INVALID), not 401.
      const badKey = err.status === 400 && /API[_ ]KEY[_ ]INVALID|API key not valid|API key expired/i.test(err.message || "");
      const code = badKey ? CODES.AUTH : codeForStatus(err.status);
      return new AssistantProviderError(code, `gemini returned HTTP ${err.status}`, {
        provider: id,
        status: err.status,
        mayHaveProcessed: code === CODES.TIMEOUT,
        cause: err,
      });
    }
    // fetch() itself failed: nothing reached Google.
    if (err?.name === "TypeError" && /fetch failed/i.test(err.message || "")) {
      return new AssistantProviderError(CODES.UNAVAILABLE, "gemini could not be reached", { provider: id, cause: err });
    }
    return toProviderError(err, id);
  };

  const params = (req) => {
    const spec = modelSpec(id, req.model);
    const config = {
      systemInstruction: req.system,
      maxOutputTokens: req.maxOutputTokens + (spec.reasoningTokens || 0),
      abortSignal: req.signal,
    };
    if (spec.temperature && typeof req.temperature === "number") config.temperature = req.temperature;
    return {
      model: req.model,
      contents: req.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      config,
    };
  };

  return {
    id,

    async *stream(req) {
      let response;
      try {
        response = await ai.models.generateContentStream(params(req));
      } catch (err) {
        throw normalizeError(err);
      }
      let usage = null;
      let finish = null;
      let blocked = false;
      try {
        for await (const chunk of response) {
          if (chunk.promptFeedback?.blockReason) blocked = true;
          const text = textOf(chunk);
          if (text) yield { type: "delta", text };
          if (chunk.usageMetadata) usage = chunk.usageMetadata;
          const reason = chunk.candidates?.[0]?.finishReason;
          if (reason) finish = reason;
        }
      } catch (err) {
        const e = normalizeError(err);
        e.mayHaveProcessed = true;
        throw e;
      }
      yield { type: "done", usage: usageOf(usage), finishReason: blocked ? "content_filtered" : finishOf(finish) };
    },

    async generate(req) {
      try {
        const res = await ai.models.generateContent(params(req));
        const blocked = !!res.promptFeedback?.blockReason;
        return { text: textOf(res), usage: usageOf(res.usageMetadata), finishReason: blocked ? "content_filtered" : finishOf(res.candidates?.[0]?.finishReason) };
      } catch (err) {
        throw normalizeError(err);
      }
    },

    validateConfig() {
      const problems = [];
      if (!client && !apiKey) problems.push("No API key for gemini");
      return { ok: problems.length === 0, problems };
    },

    /** Free: reads the model's description, no tokens used. */
    async checkModel(model, { signal } = {}) {
      try {
        await ai.models.get({ model, config: { abortSignal: signal } });
        return { ok: true };
      } catch (err) {
        throw normalizeError(err);
      }
    },

    normalizeError,
  };
}

module.exports = { createGeminiProvider };
