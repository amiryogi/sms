/**
 * Adapter for Anthropic's Claude Messages API (@anthropic-ai/sdk). Same contract as
 * ./openaiCompatible.js.
 *
 * Current Claude models reject `temperature`, and thinking cannot be switched off on
 * Claude Opus 5.5, so depth is set with `output_config.effort` ("low" suits short help
 * answers). On Opus 5.5 and Sonnet 5.5 a refused request is re-run server-side on another
 * model (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).
 *
 * This deployment calls Claude only when ANTHROPIC_API_KEY is set; without it the provider
 * cannot be selected. The adapter is tested against a mocked SDK.
 */
const Anthropic = require("@anthropic-ai/sdk");
const { AssistantProviderError, CODES, codeForStatus, toProviderError } = require("./errors");
const { modelSpec } = require("./models");

const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const finishOf = (stopReason) => {
  if (stopReason === "max_tokens") return "length";
  if (stopReason === "refusal") return "content_filtered";
  return "stop";
};

const usageOf = (u) => ({
  inputTokens: (u?.input_tokens || 0) + (u?.cache_read_input_tokens || 0) + (u?.cache_creation_input_tokens || 0),
  outputTokens: u?.output_tokens || 0,
});

const textOf = (message) =>
  (message?.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

/**
 * @param {object} opts
 * @param {string} [opts.apiKey]
 * @param {object} [opts.client]  an Anthropic client (tests pass a fake)
 */
function createAnthropicProvider({ apiKey, client } = {}) {
  const id = "anthropic";
  const api = client || new Anthropic({ apiKey, maxRetries: 0, timeout: 120000 });

  const normalizeError = (err) => {
    if (err instanceof AssistantProviderError) return err;
    if (err instanceof Anthropic.APIUserAbortError) return new AssistantProviderError(CODES.ABORTED, "Request aborted", { provider: id, cause: err });
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      return new AssistantProviderError(CODES.TIMEOUT, "anthropic timed out", { provider: id, mayHaveProcessed: true, cause: err });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return new AssistantProviderError(CODES.UNAVAILABLE, "anthropic could not be reached", { provider: id, cause: err });
    }
    if (err instanceof Anthropic.APIError && typeof err.status === "number") {
      // 529 overloaded and every 5xx: unavailable
      const code = codeForStatus(err.status);
      return new AssistantProviderError(code, `anthropic returned HTTP ${err.status}`, {
        provider: id,
        status: err.status,
        mayHaveProcessed: code === CODES.TIMEOUT,
        cause: err,
      });
    }
    return toProviderError(err, id);
  };

  /** Request body, and which endpoint takes it (beta when server-side fallback is on). */
  const request = (req) => {
    const spec = modelSpec(id, req.model);
    const params = {
      model: req.model,
      max_tokens: req.maxOutputTokens + (spec.reasoningTokens || 0),
      system: req.system,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      output_config: { effort: spec.effort || "low" },
    };
    if (spec.serverFallback) {
      return { target: api.beta.messages, params: { ...params, betas: [FALLBACK_BETA], fallbacks: "default" } };
    }
    return { target: api.messages, params };
  };

  return {
    id,

    async *stream(req) {
      const { target, params } = request(req);
      let stream;
      try {
        stream = target.stream(params, { signal: req.signal });
      } catch (err) {
        throw normalizeError(err);
      }
      let produced = false;
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
            produced = true;
            yield { type: "delta", text: event.delta.text };
          }
        }
        const final = await stream.finalMessage();
        yield { type: "done", usage: usageOf(final.usage), finishReason: finishOf(final.stop_reason) };
      } catch (err) {
        const e = normalizeError(err);
        if (produced) e.mayHaveProcessed = true;
        throw e;
      }
    },

    async generate(req) {
      const { target, params } = request(req);
      try {
        const message = await target.create(params, { signal: req.signal });
        return { text: textOf(message), usage: usageOf(message.usage), finishReason: finishOf(message.stop_reason) };
      } catch (err) {
        throw normalizeError(err);
      }
    },

    validateConfig() {
      const problems = [];
      if (!client && !apiKey) problems.push("No API key for anthropic");
      return { ok: problems.length === 0, problems };
    },

    /** Free: reads the model's description from the Models API, no tokens used. */
    async checkModel(model, { signal } = {}) {
      try {
        await api.models.retrieve(model, {}, { signal });
        return { ok: true };
      } catch (err) {
        throw normalizeError(err);
      }
    },

    normalizeError,
  };
}

module.exports = { createAnthropicProvider };
