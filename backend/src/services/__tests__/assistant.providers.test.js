/**
 * The AI provider adapters against mocked SDK clients: no network, no keys.
 * Each adapter must turn its SDK's responses and errors into the shared contract
 * (delta / done events, { inputTokens, outputTokens }, AssistantProviderError codes).
 */
const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");
const { ApiError: GeminiApiError } = require("@google/genai");
const { createOpenAICompatibleProvider } = require("../assistant/providers/openaiCompatible");
const { createGeminiProvider } = require("../assistant/providers/gemini");
const { createAnthropicProvider } = require("../assistant/providers/anthropic");
const { AssistantProviderError, CODES, codeForStatus, toProviderError } = require("../assistant/providers/errors");
const { modelSpec, estimateCost, MODELS } = require("../assistant/providers/models");

const REQ = {
  model: "test-model",
  system: "You are a test.",
  messages: [
    { role: "user", content: "Hi" },
    { role: "assistant", content: "Hello" },
    { role: "user", content: "How do I take attendance?" },
  ],
  maxOutputTokens: 500,
  temperature: 0.3,
};

const iterate = (items) => ({
  async *[Symbol.asyncIterator]() {
    for (const item of items) yield item;
  },
});
const failingAfter = (items, error) => ({
  async *[Symbol.asyncIterator]() {
    for (const item of items) yield item;
    throw error;
  },
});
const collect = async (iterable) => {
  const out = [];
  for await (const ev of iterable) out.push(ev);
  return out;
};
const textOf = (events) => events.filter((e) => e.type === "delta").map((e) => e.text).join("");
const rejectWith = async (promise) => {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error("expected a rejection");
};

describe("errors", () => {
  it("maps HTTP statuses to provider-neutral codes", () => {
    expect(codeForStatus(401)).toBe(CODES.AUTH);
    expect(codeForStatus(403)).toBe(CODES.AUTH);
    expect(codeForStatus(404)).toBe(CODES.MODEL_NOT_FOUND);
    expect(codeForStatus(408)).toBe(CODES.TIMEOUT);
    expect(codeForStatus(429)).toBe(CODES.RATE_LIMITED);
    expect(codeForStatus(400)).toBe(CODES.BAD_REQUEST);
    expect(codeForStatus(500)).toBe(CODES.UNAVAILABLE);
    expect(codeForStatus(529)).toBe(CODES.UNAVAILABLE);
  });

  it("marks retryable codes and keeps user messages free of technical detail", () => {
    const e = new AssistantProviderError(CODES.RATE_LIMITED, "gemini returned HTTP 429 with secret detail");
    expect(e.retryable).toBe(true);
    expect(e.userMessage).not.toMatch(/429|secret/);
    expect(new AssistantProviderError(CODES.AUTH, "x").retryable).toBe(false);
  });

  it("turns an AbortError into 'aborted' and unknown errors into 'unknown'", () => {
    const abort = new Error("stop");
    abort.name = "AbortError";
    expect(toProviderError(abort, "p").code).toBe(CODES.ABORTED);
    expect(toProviderError(new Error("boom"), "p").code).toBe(CODES.UNKNOWN);
    expect(toProviderError({ status: 504 }, "p")).toMatchObject({ code: CODES.TIMEOUT, mayHaveProcessed: true });
  });
});

describe("models", () => {
  it("lists every provider and gives custom ids their provider's defaults", () => {
    expect(Object.keys(MODELS).sort()).toEqual(["anthropic", "gemini", "nvidia", "openai"]);
    expect(modelSpec("openai", "some-new-model")).toMatchObject({ verified: "custom", temperature: false, tokenParam: "max_completion_tokens" });
    expect(modelSpec("anthropic", "claude-haiku-5-5")).toMatchObject({ temperature: false, effort: "low" });
  });

  it("estimates cost only when the price is known", () => {
    expect(estimateCost("anthropic", "claude-haiku-5-5", 1_000_000, 1_000_000)).toBeCloseTo(0.6);
    expect(estimateCost("gemini", "gemini-3.5-flash-lite", 1000, 1000)).toBeNull();
  });
});

describe("OpenAI-compatible adapter (OpenAI and NVIDIA)", () => {
  const client = (create, list = []) => ({ chat: { completions: { create } }, models: { list: () => iterate(list) } });

  it("streams text deltas, ignores reasoning, and reports usage", async () => {
    const create = jest.fn(async () =>
      iterate([
        { choices: [{ delta: { reasoning_content: "thinking…" } }] },
        { choices: [{ delta: { content: "नमस्ते " } }] },
        { choices: [{ delta: { content: "world" }, finish_reason: "stop" }] },
        { choices: [], usage: { prompt_tokens: 120, completion_tokens: 30 } },
      ])
    );
    const p = createOpenAICompatibleProvider({ id: "nvidia", client: client(create) });
    const events = await collect(p.stream({ ...REQ, model: "nvidia/nemotron-3.5-lightning-30b-a3b" }));
    expect(textOf(events)).toBe("नमस्ते world");
    expect(events.at(-1)).toEqual({ type: "done", usage: { inputTokens: 120, outputTokens: 30 }, finishReason: "stop" });
    const body = create.mock.calls[0][0];
    expect(body.messages[0]).toEqual({ role: "system", content: "You are a test." });
    expect(body.messages).toHaveLength(4);
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
    // NVIDIA: max_tokens with room for reasoning, temperature sent
    expect(body.max_tokens).toBe(500 + 2500);
    expect(body.temperature).toBe(0.3);
  });

  it("uses max_completion_tokens and no temperature for OpenAI models", async () => {
    const create = jest.fn(async () => iterate([{ choices: [{ delta: { content: "ok" }, finish_reason: "stop" }] }]));
    const p = createOpenAICompatibleProvider({ id: "openai", client: client(create) });
    await collect(p.stream({ ...REQ, model: "gpt-6-luna" }));
    const body = create.mock.calls[0][0];
    expect(body.max_completion_tokens).toBe(500 + 1024);
    expect(body).not.toHaveProperty("max_tokens");
    expect(body).not.toHaveProperty("temperature");
  });

  it("passes the abort signal through", async () => {
    const create = jest.fn(async () => iterate([]));
    const p = createOpenAICompatibleProvider({ id: "openai", client: client(create) });
    const signal = new AbortController().signal;
    await collect(p.stream({ ...REQ, signal }));
    expect(create.mock.calls[0][1]).toEqual({ signal });
  });

  it("generates a whole answer without streaming", async () => {
    const create = jest.fn(async () => ({ choices: [{ message: { content: "Full answer" }, finish_reason: "length" }], usage: { prompt_tokens: 10, completion_tokens: 5 } }));
    const p = createOpenAICompatibleProvider({ id: "openai", client: client(create) });
    await expect(p.generate(REQ)).resolves.toEqual({ text: "Full answer", usage: { inputTokens: 10, outputTokens: 5 }, finishReason: "length" });
  });

  it.each([
    [401, CODES.AUTH],
    [404, CODES.MODEL_NOT_FOUND],
    [429, CODES.RATE_LIMITED],
    [500, CODES.UNAVAILABLE],
    [400, CODES.BAD_REQUEST],
  ])("normalizes HTTP %i to %s, not processed", async (status, code) => {
    const create = jest.fn(async () => {
      throw OpenAI.APIError.generate(status, { error: { message: "nope" } }, "nope", new Headers());
    });
    const p = createOpenAICompatibleProvider({ id: "openai", client: client(create) });
    const err = await rejectWith(collect(p.stream(REQ)));
    expect(err).toBeInstanceOf(AssistantProviderError);
    expect(err).toMatchObject({ code, provider: "openai", status, mayHaveProcessed: false });
  });

  it("normalizes timeout (may have been processed), connection failure and user abort", async () => {
    const make = (error) => createOpenAICompatibleProvider({ id: "openai", client: client(jest.fn(async () => { throw error; })) });
    expect(await rejectWith(collect(make(new OpenAI.APIConnectionTimeoutError()).stream(REQ)))).toMatchObject({ code: CODES.TIMEOUT, mayHaveProcessed: true });
    expect(await rejectWith(collect(make(new OpenAI.APIConnectionError({ message: "ECONNREFUSED" })).stream(REQ)))).toMatchObject({ code: CODES.UNAVAILABLE, mayHaveProcessed: false });
    expect(await rejectWith(collect(make(new OpenAI.APIUserAbortError()).stream(REQ)))).toMatchObject({ code: CODES.ABORTED });
  });

  it("marks an error after text started as possibly processed", async () => {
    const create = jest.fn(async () => failingAfter([{ choices: [{ delta: { content: "part" } }] }], new OpenAI.APIConnectionError({ message: "reset" })));
    const p = createOpenAICompatibleProvider({ id: "nvidia", client: client(create) });
    const events = [];
    const err = await rejectWith((async () => {
      for await (const ev of p.stream(REQ)) events.push(ev);
    })());
    expect(textOf(events)).toBe("part");
    expect(err).toMatchObject({ code: CODES.UNAVAILABLE, mayHaveProcessed: true });
  });

  it("reports a content filter finish", async () => {
    const create = jest.fn(async () => iterate([{ choices: [{ delta: {}, finish_reason: "content_filter" }] }]));
    const p = createOpenAICompatibleProvider({ id: "openai", client: client(create) });
    const events = await collect(p.stream(REQ));
    expect(events.at(-1).finishReason).toBe("content_filtered");
  });

  it("checks a model by listing the account's models (free)", async () => {
    const p = createOpenAICompatibleProvider({ id: "nvidia", client: client(jest.fn(), [{ id: "a" }, { id: "b" }]) });
    await expect(p.checkModel("b")).resolves.toEqual({ ok: true });
    await expect(p.checkModel("zzz")).rejects.toMatchObject({ code: CODES.MODEL_NOT_FOUND });
  });

  it("validates configuration", () => {
    expect(createOpenAICompatibleProvider({ id: "openai", apiKey: "" , baseURL: "http://x" }).validateConfig().ok).toBe(false);
    expect(createOpenAICompatibleProvider({ id: "openai", client: client(jest.fn()) }).validateConfig().ok).toBe(true);
  });
});

describe("Gemini adapter", () => {
  const chunk = (text, extra = {}) => ({ candidates: [{ content: { parts: [{ text }] } }], ...extra });

  it("streams answer text without thought parts and counts thinking as output", async () => {
    const generateContentStream = jest.fn(async () =>
      iterate([
        { candidates: [{ content: { parts: [{ text: "secret reasoning", thought: true }] } }] },
        chunk("हाजिरी "),
        chunk("लिनुहोस्", { candidates: [{ content: { parts: [{ text: "लिनुहोस्" }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 40, thoughtsTokenCount: 100 } }),
      ])
    );
    const p = createGeminiProvider({ client: { models: { generateContentStream } } });
    const events = await collect(p.stream({ ...REQ, model: "gemini-3.5-flash" }));
    expect(textOf(events)).toBe("हाजिरी लिनुहोस्");
    expect(events.at(-1)).toEqual({ type: "done", usage: { inputTokens: 200, outputTokens: 140 }, finishReason: "stop" });
    const params = generateContentStream.mock.calls[0][0];
    expect(params.config.systemInstruction).toBe("You are a test.");
    expect(params.config.maxOutputTokens).toBe(500 + 1024);
    expect(params.config.temperature).toBe(0.3);
    expect(params.contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
  });

  it("reports blocked prompts and safety stops as content_filtered", async () => {
    const blocked = createGeminiProvider({ client: { models: { generateContentStream: jest.fn(async () => iterate([{ promptFeedback: { blockReason: "SAFETY" } }])) } } });
    expect((await collect(blocked.stream(REQ))).at(-1).finishReason).toBe("content_filtered");
    const safety = createGeminiProvider({ client: { models: { generateContentStream: jest.fn(async () => iterate([{ candidates: [{ finishReason: "SAFETY" }] }])) } } });
    expect((await collect(safety.stream(REQ))).at(-1).finishReason).toBe("content_filtered");
  });

  it.each([
    [401, CODES.AUTH],
    [404, CODES.MODEL_NOT_FOUND],
    [429, CODES.RATE_LIMITED],
    [503, CODES.UNAVAILABLE],
  ])("normalizes ApiError %i to %s", async (status, code) => {
    const p = createGeminiProvider({ client: { models: { generateContentStream: jest.fn(async () => { throw new GeminiApiError({ message: "x", status }); }) } } });
    expect(await rejectWith(collect(p.stream(REQ)))).toMatchObject({ code, provider: "gemini", mayHaveProcessed: false });
  });

  it("treats Google's 400 'API key not valid' as auth", async () => {
    const p = createGeminiProvider({ client: { models: { generateContentStream: jest.fn(async () => { throw new GeminiApiError({ message: '{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}', status: 400 }); }) } } });
    expect(await rejectWith(collect(p.stream(REQ)))).toMatchObject({ code: CODES.AUTH });
  });

  it("normalizes a network failure and an abort", async () => {
    const net = new TypeError("fetch failed");
    const p1 = createGeminiProvider({ client: { models: { generateContentStream: jest.fn(async () => { throw net; }) } } });
    expect(await rejectWith(collect(p1.stream(REQ)))).toMatchObject({ code: CODES.UNAVAILABLE });
    const abort = new Error("aborted");
    abort.name = "AbortError";
    const p2 = createGeminiProvider({ client: { models: { generateContentStream: jest.fn(async () => { throw abort; }) } } });
    expect(await rejectWith(collect(p2.stream(REQ)))).toMatchObject({ code: CODES.ABORTED });
  });

  it("generates without streaming and checks models for free", async () => {
    const generateContent = jest.fn(async () => ({ candidates: [{ content: { parts: [{ text: "OK" }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1 } }));
    const get = jest.fn(async () => ({ name: "models/x" }));
    const p = createGeminiProvider({ client: { models: { generateContent, get } } });
    await expect(p.generate(REQ)).resolves.toEqual({ text: "OK", usage: { inputTokens: 5, outputTokens: 1 }, finishReason: "stop" });
    await expect(p.checkModel("gemini-3.5-flash-lite")).resolves.toEqual({ ok: true });
    expect(get.mock.calls[0][0].model).toBe("gemini-3.5-flash-lite");
  });
});

describe("Anthropic adapter", () => {
  const messageStream = (events, final) => ({
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e;
    },
    finalMessage: async () => final,
  });

  const fakeClient = ({ stream, create, retrieve } = {}) => ({
    messages: { stream: stream || jest.fn(), create: create || jest.fn() },
    beta: { messages: { stream: stream || jest.fn(), create: create || jest.fn() } },
    models: { retrieve: retrieve || jest.fn(async () => ({ id: "m" })) },
  });

  it("streams text deltas, sends effort and no temperature, and reports usage", async () => {
    const stream = jest.fn(() =>
      messageStream(
        [
          { type: "content_block_start", content_block: { type: "thinking" } },
          { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "" } },
          { type: "content_block_delta", delta: { type: "text_delta", text: "Open " } },
          { type: "content_block_delta", delta: { type: "text_delta", text: "Attendance." } },
        ],
        { stop_reason: "end_turn", usage: { input_tokens: 300, output_tokens: 50, cache_read_input_tokens: 0 } }
      )
    );
    const client = fakeClient({ stream });
    const p = createAnthropicProvider({ client });
    const events = await collect(p.stream({ ...REQ, model: "claude-haiku-5-5" }));
    expect(textOf(events)).toBe("Open Attendance.");
    expect(events.at(-1)).toEqual({ type: "done", usage: { inputTokens: 300, outputTokens: 50 }, finishReason: "stop" });
    const params = stream.mock.calls[0][0];
    expect(params).toMatchObject({ model: "claude-haiku-5-5", system: "You are a test.", output_config: { effort: "low" }, max_tokens: 500 + 1024 });
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("fallbacks");
  });

  it("uses the beta endpoint with server-side refusal fallback on Opus and Sonnet 5.5", async () => {
    const betaStream = jest.fn(() => messageStream([], { stop_reason: "end_turn", usage: {} }));
    const client = fakeClient();
    client.beta.messages.stream = betaStream;
    const p = createAnthropicProvider({ client });
    await collect(p.stream({ ...REQ, model: "claude-opus-5-5" }));
    expect(betaStream.mock.calls[0][0]).toMatchObject({ betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
    expect(client.messages.stream).not.toHaveBeenCalled();
  });

  it("reports a refusal as content_filtered", async () => {
    const p = createAnthropicProvider({ client: fakeClient({ stream: jest.fn(() => messageStream([], { stop_reason: "refusal", usage: {} })) }) });
    expect((await collect(p.stream({ ...REQ, model: "claude-haiku-5-5" }))).at(-1).finishReason).toBe("content_filtered");
  });

  it.each([
    [401, CODES.AUTH],
    [429, CODES.RATE_LIMITED],
    [529, CODES.UNAVAILABLE],
    [404, CODES.MODEL_NOT_FOUND],
  ])("normalizes HTTP %i to %s", async (status, code) => {
    const error = Anthropic.APIError.generate(status, { type: "error", error: { type: "x", message: "x" } }, "x", new Headers());
    const p = createAnthropicProvider({ client: fakeClient({ stream: jest.fn(() => { throw error; }) }) });
    expect(await rejectWith(collect(p.stream({ ...REQ, model: "claude-haiku-5-5" })))).toMatchObject({ code, provider: "anthropic", mayHaveProcessed: false });
  });

  it("normalizes timeout and abort", async () => {
    const timeout = createAnthropicProvider({ client: fakeClient({ stream: jest.fn(() => { throw new Anthropic.APIConnectionTimeoutError(); }) }) });
    expect(await rejectWith(collect(timeout.stream({ ...REQ, model: "claude-haiku-5-5" })))).toMatchObject({ code: CODES.TIMEOUT, mayHaveProcessed: true });
    const abort = createAnthropicProvider({ client: fakeClient({ stream: jest.fn(() => { throw new Anthropic.APIUserAbortError(); }) }) });
    expect(await rejectWith(collect(abort.stream({ ...REQ, model: "claude-haiku-5-5" })))).toMatchObject({ code: CODES.ABORTED });
  });

  it("generates without streaming and checks models through the Models API", async () => {
    const create = jest.fn(async () => ({ content: [{ type: "text", text: "OK" }], stop_reason: "end_turn", usage: { input_tokens: 9, output_tokens: 1 } }));
    const retrieve = jest.fn(async () => ({ id: "claude-haiku-5-5" }));
    const p = createAnthropicProvider({ client: fakeClient({ create, retrieve }) });
    await expect(p.generate({ ...REQ, model: "claude-haiku-5-5" })).resolves.toEqual({ text: "OK", usage: { inputTokens: 9, outputTokens: 1 }, finishReason: "stop" });
    await expect(p.checkModel("claude-haiku-5-5")).resolves.toEqual({ ok: true });
    expect(retrieve.mock.calls[0][0]).toBe("claude-haiku-5-5");
  });
});
