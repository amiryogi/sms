/**
 * Adapter for OpenAI's Chat Completions API and services that speak the same protocol
 * (NVIDIA's build.nvidia.com at https://integrate.api.nvidia.com/v1).
 *
 * Contract shared by every adapter (see ./index.js):
 *   stream(req)        async iterator: { type: "delta", text } ... then { type: "done", usage, finishReason }
 *   generate(req)      { text, usage, finishReason }
 *   validateConfig()   { ok, problems }
 *   checkModel(model)  { ok } or throws AssistantProviderError
 *   normalizeError(e)  AssistantProviderError
 * where req = { model, system, messages: [{ role: "user"|"assistant", content }], maxOutputTokens,
 * temperature, signal }. Nothing from the SDK leaves this file.
 */
const { OpenAI, APIError, APIConnectionError, APIConnectionTimeoutError, APIUserAbortError } = require("openai");
const { AssistantProviderError, CODES, codeForStatus, toProviderError } = require("./errors");
const { modelSpec } = require("./models");

const FINISH = { stop: "stop", length: "length", content_filter: "content_filtered" };

/**
 * @param {object} opts
 * @param {"openai"|"nvidia"} opts.id
 * @param {string} [opts.apiKey]
 * @param {string} [opts.baseURL]
 * @param {object} [opts.client]  an OpenAI client (tests pass a fake)
 */
function createOpenAICompatibleProvider({ id, apiKey, baseURL, client } = {}) {
  // Built on first use: the SDK refuses to construct a client without a key.
  let sdk = client || null;
  const api = () => sdk || (sdk = new OpenAI({ apiKey, baseURL, maxRetries: 0, timeout: 120000 }));

  const normalizeError = (err) => {
    if (err instanceof AssistantProviderError) return err;
    if (err instanceof APIUserAbortError) return new AssistantProviderError(CODES.ABORTED, "Request aborted", { provider: id, cause: err });
    // The request was sent: the provider may still run (and bill) it.
    if (err instanceof APIConnectionTimeoutError) {
      return new AssistantProviderError(CODES.TIMEOUT, `${id} timed out`, { provider: id, mayHaveProcessed: true, cause: err });
    }
    if (err instanceof APIConnectionError) {
      return new AssistantProviderError(CODES.UNAVAILABLE, `${id} could not be reached`, { provider: id, cause: err });
    }
    if (err instanceof APIError && typeof err.status === "number") {
      const filtered = err.code === "content_filter" || err.error?.code === "content_filter";
      const code = filtered ? CODES.CONTENT_FILTERED : codeForStatus(err.status);
      return new AssistantProviderError(code, `${id} returned HTTP ${err.status}`, {
        provider: id,
        status: err.status,
        mayHaveProcessed: code === CODES.TIMEOUT,
        cause: err,
      });
    }
    return toProviderError(err, id);
  };

  const body = (req, stream) => {
    const spec = modelSpec(id, req.model);
    const limit = req.maxOutputTokens + (spec.reasoningTokens || 0);
    const out = {
      model: req.model,
      messages: [{ role: "system", content: req.system }, ...req.messages.map((m) => ({ role: m.role, content: m.content }))],
      stream,
    };
    out[spec.tokenParam === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens"] = limit;
    if (spec.temperature && typeof req.temperature === "number") out.temperature = req.temperature;
    if (stream) out.stream_options = { include_usage: true };
    return out;
  };

  const usageOf = (u) => ({ inputTokens: u?.prompt_tokens || 0, outputTokens: u?.completion_tokens || 0 });

  return {
    id,

    async *stream(req) {
      let response;
      try {
        response = await api().chat.completions.create(body(req, true), { signal: req.signal });
      } catch (err) {
        throw normalizeError(err);
      }
      let usage = null;
      let finish = null;
      try {
        for await (const chunk of response) {
          const choice = chunk.choices?.[0];
          // Reasoning models also stream `reasoning_content`: never shown to users.
          const text = choice?.delta?.content;
          if (text) yield { type: "delta", text };
          if (choice?.finish_reason) finish = choice.finish_reason;
          if (chunk.usage) usage = chunk.usage;
        }
      } catch (err) {
        const e = normalizeError(err);
        e.mayHaveProcessed = true; // part of the answer was already produced
        throw e;
      }
      yield { type: "done", usage: usageOf(usage), finishReason: FINISH[finish] || "stop" };
    },

    async generate(req) {
      try {
        const res = await api().chat.completions.create(body(req, false), { signal: req.signal });
        const choice = res.choices?.[0];
        return { text: choice?.message?.content || "", usage: usageOf(res.usage), finishReason: FINISH[choice?.finish_reason] || "stop" };
      } catch (err) {
        throw normalizeError(err);
      }
    },

    validateConfig() {
      const problems = [];
      if (!client && !apiKey) problems.push(`No API key for ${id}`);
      return { ok: problems.length === 0, problems };
    },

    /** Free: lists the account's models, no tokens used. */
    async checkModel(model, { signal } = {}) {
      try {
        for await (const m of api().models.list({ signal })) {
          if (m.id === model) return { ok: true };
        }
      } catch (err) {
        throw normalizeError(err);
      }
      throw new AssistantProviderError(CODES.MODEL_NOT_FOUND, `${id} has no model ${model}`, { provider: id });
    },

    normalizeError,
  };
}

module.exports = { createOpenAICompatibleProvider };
