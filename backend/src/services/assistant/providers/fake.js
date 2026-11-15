/**
 * A canned provider for automated tests and e2e runs (ASSISTANT_FAKE_PROVIDER=true outside
 * production). It never calls the network. It answers from the first help document in the
 * system prompt, in Nepali when the prompt asks for Nepali, and streams the text in small
 * pieces so the browser sees real streaming.
 *
 * A question containing "[fail:<code>]" fails with that error code before any text, and one
 * containing "[slow]" waits 2 s first, so error and loading states can be tested.
 */
const { AssistantProviderError, CODES } = require("./errors");

const pause = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener?.("abort", () => {
      clearTimeout(t);
      const e = new Error("aborted");
      e.name = "AbortError";
      reject(e);
    });
  });

function answerFor(req) {
  const docTitle = /<document id="[^"]*" title="([^"]*)"/.exec(req.system || "")?.[1] || "Using the app";
  const nepali = /Write the answer in natural, simple Nepali/.test(req.system || "");
  if (nepali) {
    return `**${docTitle}** (परीक्षण उत्तर)\n\n1. बायाँ मेनुबाट पृष्ठ खोल्नुहोस्।\n2. पृष्ठमा दिइएका चरणहरू पालना गर्नुहोस्।\n3. अन्त्यमा **Save** थिच्नुहोस्।`;
  }
  return `**${docTitle}** (test answer)\n\n1. Open the page from the left menu.\n2. Follow the steps on the page.\n3. Finish with **Save**.`;
}

function createFakeProvider({ id = "fake" } = {}) {
  const run = async (req) => {
    const last = req.messages[req.messages.length - 1]?.content || "";
    const fail = /\[fail:([a-z_]+)\]/.exec(last)?.[1];
    if (/\[slow\]/.test(last)) await pause(2000, req.signal);
    if (fail) throw new AssistantProviderError(Object.values(CODES).includes(fail) ? fail : CODES.UNKNOWN, `fake ${fail}`, { provider: id });
    return answerFor(req);
  };
  const usage = (req, text) => ({ inputTokens: Math.ceil((req.system.length + 50) / 4), outputTokens: Math.ceil(text.length / 4) });

  return {
    id,
    async *stream(req) {
      const text = await run(req);
      const chars = [...text];
      for (let i = 0; i < chars.length; i += 6) {
        await pause(5, req.signal);
        yield { type: "delta", text: chars.slice(i, i + 6).join("") };
      }
      yield { type: "done", usage: usage(req, text), finishReason: "stop" };
    },
    async generate(req) {
      const text = await run(req);
      return { text, usage: usage(req, text), finishReason: "stop" };
    },
    validateConfig: () => ({ ok: true, problems: [] }),
    async checkModel() {
      return { ok: true };
    },
    normalizeError: (e) => e,
  };
}

module.exports = { createFakeProvider };
