#!/usr/bin/env node
/**
 * Live check of one AI provider through the assistant's real pipeline (help documents,
 * prompt, adapter). Run by hand with a real key in backend/.env; never part of `npm test`.
 *
 *   node scripts/assistant-smoke.js --provider gemini [--model gemini-3.5-flash-lite]
 *   node scripts/assistant-smoke.js --provider nvidia --evals 10 --delay 3000
 *
 * Steps:
 *   1. the key is installed (its value is never printed);
 *   2. the model is listed (free);
 *   3. a Nepali question streams: time to first text, Devanagari share, the English button
 *      label kept, token usage;
 *   4. an English question without streaming;
 *   5. a wrong key is reported as "auth";
 *   6. the evaluation set (src/data/assistant/evals.json), checked automatically for language,
 *      labels that must or must not appear and the document found; the answers are written to
 *      a Markdown report for a person to read.
 *
 * OpenAI and Anthropic bill per token, so they run only with --allow-paid.
 */
require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PROVIDERS, apiKeyFor } = require("../src/services/assistant/providers");
const { modelSpec, estimateCost } = require("../src/services/assistant/providers/models");
const { normalizeAssistantConfig } = require("../src/utils/assistantConfig");
const knowledge = require("../src/services/assistant/knowledge");
const { resolveLanguage } = require("../src/services/assistant/languageResolver");
const { buildPrompt } = require("../src/services/assistant/promptBuilder");
const EVALS = require("../src/data/assistant/evals.json");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
    return acc;
  }, [])
);
const providerId = args.provider;
const PAID = ["openai", "anthropic"];
const DEFAULT_MODEL = { gemini: "gemini-3.5-flash-lite", nvidia: "nvidia/nemotron-3.5-lightning-30b-a3b", openai: "gpt-6-luna", anthropic: "claude-haiku-5-5" };

if (!PROVIDERS[providerId]) {
  console.error(`--provider must be one of: ${Object.keys(PROVIDERS).join(", ")}`);
  process.exit(2);
}
if (PAID.includes(providerId) && !args["allow-paid"]) {
  console.error(`${providerId} bills per token. Add --allow-paid to run it.`);
  process.exit(2);
}
const model = typeof args.model === "string" ? args.model : DEFAULT_MODEL[providerId];
const evalLimit = args.evals === undefined ? EVALS.length : Number(args.evals);
const delayMs = Number(args.delay ?? 2500);
const outDir = typeof args.out === "string" ? args.out : os.tmpdir();
const settings = normalizeAssistantConfig({ provider: providerId, model });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const devanagariShare = (text) => {
  const letters = [...String(text)].filter((c) => /\p{L}/u.test(c));
  return letters.length ? letters.filter((c) => /[ऀ-ॿ]/.test(c)).length / letters.length : 0;
};
const results = [];
const step = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

function promptFor(role, question, context = null) {
  const lang = resolveLanguage({ preference: "auto", message: question, settings });
  let hits = knowledge.search(question, { roles: [role], context, limit: 3 });
  if (!hits.length) hits = [{ doc: knowledge.getDocument("getting-around") }];
  const docs = hits.map((h) => h.doc);
  return { lang: lang.language, docs, ...buildPrompt({ roles: [role], language: lang.language, romanized: !!lang.detected?.romanized, context, docs, history: [], question }) };
}

async function streamOnce(provider, prompt) {
  const started = Date.now();
  let first = 0;
  let text = "";
  let done = null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
  try {
    for await (const ev of provider.stream({ ...prompt, model, maxOutputTokens: settings.maxOutputTokens, temperature: settings.temperature, signal: controller.signal })) {
      if (ev.type === "delta") {
        if (!first) first = Date.now() - started;
        text += ev.text;
      } else if (ev.type === "done") done = ev;
    }
  } finally {
    clearTimeout(timer);
  }
  return { text, first, total: Date.now() - started, usage: done?.usage, finishReason: done?.finishReason };
}

(async () => {
  console.log(`Provider ${providerId} (${PROVIDERS[providerId].label}), model ${model} [${modelSpec(providerId, model).verified}]`);
  const key = apiKeyFor(providerId);
  step("API key installed", !!key, key ? `${PROVIDERS[providerId].envKey} is set` : `${PROVIDERS[providerId].envKey} is missing`);
  if (!key) process.exit(1);
  const provider = PROVIDERS[providerId].build(key);

  try {
    await provider.checkModel(model);
    step("model is listed", true);
  } catch (e) {
    step("model is listed", false, e.code);
  }

  try {
    const p = promptFor("TEACHER", "विद्यार्थीको हाजिरी कसरी गर्ने?", { pattern: "/teacher/attendance", module: "attendance", title: "Attendance" });
    const r = await streamOnce(provider, p);
    const share = devanagariShare(r.text);
    step("Nepali answer streams", r.text.length > 20, `first text ${r.first} ms, total ${r.total} ms, ${r.usage?.inputTokens}/${r.usage?.outputTokens} tokens`);
    step("answer is in Nepali", share >= 0.4, `Devanagari share ${share.toFixed(2)}`);
    step("button label kept in English", /Save Attendance/.test(r.text));
    step("usage reported", (r.usage?.inputTokens || 0) > 0);
    console.log(`----\n${r.text}\n----`);
  } catch (e) {
    step("Nepali answer streams", false, `${e.code}: ${e.message}`);
  }

  try {
    const p = promptFor("ACCOUNTANT", "How do I record a fee payment?");
    const r = await provider.generate({ ...p, model, maxOutputTokens: settings.maxOutputTokens, temperature: settings.temperature });
    step("English answer without streaming", /Record payment/i.test(r.text) && devanagariShare(r.text) < 0.05, `${r.usage.inputTokens}/${r.usage.outputTokens} tokens`);
  } catch (e) {
    step("English answer without streaming", false, `${e.code}: ${e.message}`);
  }

  try {
    // A real request: some providers (NVIDIA) list models without checking the key.
    const bad = PROVIDERS[providerId].build("invalid-key-for-smoke-test");
    await bad.generate({ model, system: "Reply OK.", messages: [{ role: "user", content: "OK?" }], maxOutputTokens: 200, temperature: 0 });
    step("wrong key is reported as auth", false, "the wrong key was accepted");
  } catch (e) {
    step("wrong key is reported as auth", e.code === "auth", e.code);
  }

  // Evaluation set
  const cases = EVALS.slice(0, evalLimit);
  const report = [`# Assistant evaluation: ${providerId} / ${model}`, "", `Run ${new Date().toISOString()}. Automatic checks are a first filter; read the answers.`, ""];
  let passed = 0;
  let tokensIn = 0;
  let tokensOut = 0;
  for (const c of cases) {
    const p = promptFor(c.role, c.q);
    const checks = [];
    let r;
    try {
      r = await streamOnce(provider, p);
    } catch (e) {
      checks.push(`error ${e.code}`);
      r = { text: "", usage: null };
    }
    tokensIn += r.usage?.inputTokens || 0;
    tokensOut += r.usage?.outputTokens || 0;
    const share = devanagariShare(r.text);
    if (c.lang === "ne" && share < 0.3) checks.push(`not Nepali (${share.toFixed(2)})`);
    if (c.lang === "en" && share > 0.05) checks.push(`not English (${share.toFixed(2)})`);
    for (const label of c.include || []) if (!r.text.toLowerCase().includes(label.toLowerCase())) checks.push(`missing "${label}"`);
    for (const label of c.exclude || []) if (r.text.includes(label)) checks.push(`contains "${label}"`);
    if (c.doc && !p.docs.some((d) => d.id === c.doc)) checks.push(`document ${c.doc} not among ${p.docs.map((d) => d.id).join(", ")}`);
    if (!r.text.trim()) checks.push("empty answer");
    const ok = checks.length === 0;
    if (ok) passed++;
    console.log(`${ok ? "PASS" : "FAIL"}  eval ${c.id} [${c.role}, ${c.kind}]${ok ? "" : `: ${checks.join("; ")}`}`);
    report.push(`## ${ok ? "✅" : "❌"} ${c.id} (${c.role}, ${c.kind}, ${c.lang})`, "", `**Q:** ${c.q}`, "", `**Docs:** ${p.docs.map((d) => d.id).join(", ")}${checks.length ? `  \n**Checks failed:** ${checks.join("; ")}` : ""}`, "", r.text || "_(no answer)_", "");
    await sleep(delayMs);
  }
  const cost = estimateCost(providerId, model, tokensIn, tokensOut);
  const summary = `Evaluation: ${passed}/${cases.length} passed automatic checks; ${tokensIn} input + ${tokensOut} output tokens${cost === null ? "" : `, about $${cost.toFixed(4)}`}.`;
  report.splice(3, 0, summary, "");
  const file = path.join(outDir, `assistant-eval-${providerId}-${Date.now()}.md`);
  fs.writeFileSync(file, report.join("\n"));
  console.log(`\n${summary}\nReport: ${file}`);
  const failedSteps = results.filter((r) => !r.ok).length;
  console.log(`Smoke steps: ${results.length - failedSteps}/${results.length} passed.`);
  process.exit(failedSteps ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
