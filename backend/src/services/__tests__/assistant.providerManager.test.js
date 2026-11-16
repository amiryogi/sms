/**
 * Provider selection, timeout and the fallback rule, with fake providers.
 */
const { streamAnswer, testConnection, setTestProvider, targetsFor, isUsable, mayFallBack, getProvider } = require("../assistant/providerManager");
const { describeProviders } = require("../assistant/providers");
const { AssistantProviderError, CODES } = require("../assistant/providers/errors");
const { normalizeAssistantConfig } = require("../../utils/assistantConfig");

const settings = (over = {}) => normalizeAssistantConfig({ provider: "gemini", model: "g-1", fallback: { enabled: true, provider: "nvidia", model: "n-1" }, timeoutMs: 5000, ...over });
const REQ = { system: "s", messages: [{ role: "user", content: "q" }], maxOutputTokens: 300, temperature: 0.2 };

/** A provider whose stream yields `parts` then finishes, or throws `error` after `parts`. */
const fake = ({ parts = ["answer"], error = null, finishReason = "stop", delayMs = 0, calls = [] } = {}) => ({
  async *stream(req) {
    calls.push(req);
    if (delayMs) {
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, delayMs);
        req.signal.addEventListener("abort", () => {
          clearTimeout(t);
          const e = new Error("aborted");
          e.name = "AbortError";
          reject(new AssistantProviderError(CODES.ABORTED, "aborted"));
        });
      });
    }
    for (const text of parts) yield { type: "delta", text };
    if (error) throw error;
    yield { type: "done", usage: { inputTokens: 10, outputTokens: 5 }, finishReason };
  },
  generate: async () => ({ text: "OK", usage: { inputTokens: 3, outputTokens: 1 }, finishReason: "stop" }),
  checkModel: async () => ({ ok: true }),
});

const run = async (s, providers, opts) => {
  setTestProvider((id) => providers[id]);
  const events = [];
  let error = null;
  try {
    for await (const ev of streamAnswer(s, REQ, opts)) events.push(ev);
  } catch (e) {
    error = e;
  }
  return { events, error, text: events.filter((e) => e.type === "delta").map((e) => e.text).join("") };
};

afterEach(() => setTestProvider(null));

describe("targets and keys", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("uses only providers whose key is installed, and never lists keys", () => {
    process.env.GEMINI_API_KEY = "AIzaSECRETSECRET";
    delete process.env.NVIDIA_API_KEY;
    delete process.env.ASSISTANT_FAKE_PROVIDER;
    expect(isUsable("gemini")).toBe(true);
    expect(isUsable("nvidia")).toBe(false);
    expect(targetsFor(settings())).toEqual([{ provider: "gemini", model: "g-1" }]);
    const described = JSON.stringify(describeProviders());
    expect(described).not.toContain("AIzaSECRETSECRET");
    expect(describeProviders().find((p) => p.id === "gemini").keyConfigured).toBe(true);
  });

  it("refuses to build a provider without a key", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ASSISTANT_FAKE_PROVIDER;
    expect(() => getProvider("openai")).toThrow(expect.objectContaining({ code: CODES.NOT_CONFIGURED }));
  });

  it("does not add the fallback when it is off or identical", () => {
    setTestProvider(() => fake());
    expect(targetsFor(settings({ fallback: { enabled: false, provider: "nvidia", model: "n-1" } }))).toHaveLength(1);
    expect(targetsFor(settings({ fallback: { enabled: true, provider: "gemini", model: "g-1" } }))).toHaveLength(1);
    expect(targetsFor(settings())).toEqual([{ provider: "gemini", model: "g-1" }, { provider: "nvidia", model: "n-1" }]);
  });

  it("ignores ASSISTANT_FAKE_PROVIDER in production", () => {
    process.env.NODE_ENV = "production";
    process.env.ASSISTANT_FAKE_PROVIDER = "true";
    delete process.env.ANTHROPIC_API_KEY;
    expect(isUsable("anthropic")).toBe(false);
  });
});

describe("streamAnswer", () => {
  it("streams from the main provider and reports which one answered", async () => {
    const calls = [];
    const { events, text, error } = await run(settings(), { gemini: fake({ parts: ["नमस्ते", " world"], calls }), nvidia: fake() });
    expect(error).toBeNull();
    expect(text).toBe("नमस्ते world");
    expect(events.at(-1)).toMatchObject({ type: "done", provider: "gemini", model: "g-1", fellBack: false, usage: { inputTokens: 10, outputTokens: 5 } });
    expect(calls[0]).toMatchObject({ model: "g-1", maxOutputTokens: 300, temperature: 0.2 });
  });

  it.each([CODES.RATE_LIMITED, CODES.UNAVAILABLE, CODES.AUTH, CODES.MODEL_NOT_FOUND])("falls back once on %s before any text", async (code) => {
    const nvidiaCalls = [];
    const { events, text } = await run(settings(), {
      gemini: fake({ parts: [], error: new AssistantProviderError(code, "x") }),
      nvidia: fake({ parts: ["from fallback"], calls: nvidiaCalls }),
    });
    expect(text).toBe("from fallback");
    expect(nvidiaCalls[0].model).toBe("n-1");
    expect(events.filter((e) => e.type === "attempt").map((e) => e.provider)).toEqual(["gemini", "nvidia"]);
    expect(events.at(-1)).toMatchObject({ provider: "nvidia", fellBack: true });
  });

  it("does not fall back after text started (the request was processed)", async () => {
    const nvidiaCalls = [];
    const { error, text } = await run(settings(), {
      gemini: fake({ parts: ["half"], error: new AssistantProviderError(CODES.UNAVAILABLE, "reset") }),
      nvidia: fake({ calls: nvidiaCalls }),
    });
    expect(text).toBe("half");
    expect(error).toMatchObject({ code: CODES.UNAVAILABLE, provider: "gemini", sentText: true });
    expect(nvidiaCalls).toHaveLength(0);
  });

  it.each([CODES.TIMEOUT, CODES.CONTENT_FILTERED, CODES.ABORTED])("never falls back on %s", async (code) => {
    const nvidiaCalls = [];
    const mayHaveProcessed = code === CODES.TIMEOUT;
    const { error } = await run(settings(), {
      gemini: fake({ parts: [], error: new AssistantProviderError(code, "x", { mayHaveProcessed }) }),
      nvidia: fake({ calls: nvidiaCalls }),
    });
    expect(error.code).toBe(code);
    expect(nvidiaCalls).toHaveLength(0);
  });

  it("does not fall back when the fallback is off", async () => {
    const { error } = await run(settings({ fallback: { enabled: false, provider: "nvidia", model: "n-1" } }), {
      gemini: fake({ parts: [], error: new AssistantProviderError(CODES.RATE_LIMITED, "x") }),
      nvidia: fake(),
    });
    expect(error.code).toBe(CODES.RATE_LIMITED);
  });

  it("turns an empty refusal into content_filtered", async () => {
    const { error } = await run(settings({ fallback: { enabled: false, provider: "nvidia", model: "n-1" } }), { gemini: fake({ parts: [], finishReason: "content_filtered" }) });
    expect(error.code).toBe(CODES.CONTENT_FILTERED);
  });

  it("times out on the school's deadline and does not resend", async () => {
    const nvidiaCalls = [];
    const { error } = await run(settings({ timeoutMs: 5000 }), { gemini: fake({ delayMs: 60000 }), nvidia: fake({ calls: nvidiaCalls }) }, {});
    // 5000 ms is the minimum allowed; the fake waits longer, so our deadline fires.
    expect(error).toMatchObject({ code: CODES.TIMEOUT, mayHaveProcessed: true });
    expect(nvidiaCalls).toHaveLength(0);
  }, 10000);

  it("stops when the caller aborts", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    const { error } = await run(settings(), { gemini: fake({ delayMs: 60000 }), nvidia: fake() }, { signal: controller.signal });
    expect(error.code).toBe(CODES.ABORTED);
  });

  it("fallback rule as a function", () => {
    expect(mayFallBack(new AssistantProviderError(CODES.RATE_LIMITED, "x"), false)).toBe(true);
    expect(mayFallBack(new AssistantProviderError(CODES.RATE_LIMITED, "x"), true)).toBe(false);
    expect(mayFallBack(new AssistantProviderError(CODES.UNKNOWN, "x", { mayHaveProcessed: true }), false)).toBe(false);
  });
});

describe("testConnection", () => {
  it("checks the model and asks for one word", async () => {
    setTestProvider(() => fake());
    await expect(testConnection({ provider: "gemini", model: "g-1" })).resolves.toMatchObject({ ok: true, sample: "OK" });
  });

  it("returns a normalized error without throwing", async () => {
    setTestProvider(() => ({ ...fake(), checkModel: async () => { throw new AssistantProviderError(CODES.AUTH, "bad key"); } }));
    const result = await testConnection({ provider: "gemini", model: "g-1" });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(CODES.AUTH);
    expect(result.error.message).not.toMatch(/bad key/);
  });
});
