/**
 * The models the admin page offers, per provider, and what each one accepts.
 *
 * Model ids change often, so this list is only a menu: an administrator may also type any
 * other id and check it with "Test connection". `verified` records how each entry was
 * checked on 2026-11-16:
 *  - "live": answered a request from this project (Gemini, NVIDIA);
 *  - "docs": taken from the provider's own documentation, not called (OpenAI, Anthropic).
 *
 * Prices are US dollars per million tokens, for the usage page's cost estimate only. A free
 * tier has `price: null` (the bill depends on the key's plan, so nothing is estimated).
 *
 * Request options:
 *  - `temperature`: send the admin's temperature (current Claude and OpenAI reasoning models
 *    reject it, so it is left out for them);
 *  - `tokenParam`: OpenAI-style APIs name the output limit differently;
 *  - `reasoningTokens`: added to the output limit for models that think before answering,
 *    so the thinking does not use up the space meant for the answer;
 *  - `effort` (Anthropic): thinking depth; "low" suits short help answers;
 *  - `serverFallback` (Anthropic): ask the API to re-run a refused request on another model.
 */

const MODELS = Object.freeze({
  gemini: [
    { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (fast, free tier)", verified: "live", price: null, temperature: true },
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (thinks first, free tier)", verified: "live", price: null, temperature: true, reasoningTokens: 1024 },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (free tier)", verified: "live", price: null, temperature: true },
  ],
  nvidia: [
    {
      id: "nvidia/nemotron-3.5-lightning-30b-a3b",
      label: "Nemotron 3.5 Lightning 30B (free, weaker Nepali)",
      verified: "live",
      price: null,
      temperature: true,
      tokenParam: "max_tokens",
      reasoningTokens: 2500,
    },
    {
      id: "mistralai/mistral-large-4-1t-a52b",
      label: "Mistral Large 4 (free, slow)",
      verified: "live",
      price: null,
      temperature: true,
      tokenParam: "max_tokens",
      reasoningTokens: 2500,
    },
  ],
  openai: [
    { id: "gpt-6-luna", label: "GPT-6 Luna (cheapest)", verified: "docs", price: { input: 0.1, output: 0.5 }, temperature: false, tokenParam: "max_completion_tokens", reasoningTokens: 1024 },
    { id: "gpt-6.1-terra", label: "GPT-6.1 Terra", verified: "docs", price: { input: 1, output: 5 }, temperature: false, tokenParam: "max_completion_tokens", reasoningTokens: 1024 },
    { id: "gpt-6.1-sol", label: "GPT-6.1 Sol", verified: "docs", price: { input: 2, output: 10 }, temperature: false, tokenParam: "max_completion_tokens", reasoningTokens: 1024 },
  ],
  anthropic: [
    { id: "claude-opus-5-5", label: "Claude Opus 5.5 (most capable)", verified: "docs", price: { input: 4, output: 20 }, temperature: false, effort: "low", serverFallback: true, reasoningTokens: 1024 },
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", verified: "docs", price: { input: 2, output: 10 }, temperature: false, effort: "low", serverFallback: true, reasoningTokens: 1024 },
    { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (cheapest)", verified: "docs", price: { input: 0.1, output: 0.5 }, temperature: false, effort: "low", serverFallback: false, reasoningTokens: 1024 },
  ],
});

/** What a model id typed by an administrator is assumed to accept, per provider. */
const CUSTOM_DEFAULTS = Object.freeze({
  gemini: { temperature: true, reasoningTokens: 1024, price: null },
  nvidia: { temperature: true, tokenParam: "max_tokens", reasoningTokens: 2500, price: null },
  openai: { temperature: false, tokenParam: "max_completion_tokens", reasoningTokens: 1024, price: null },
  anthropic: { temperature: false, effort: "low", serverFallback: false, reasoningTokens: 1024, price: null },
});

/**
 * The options for one model; an unknown id gets its provider's defaults.
 * @param {string} provider
 * @param {string} model
 */
function modelSpec(provider, model) {
  const known = (MODELS[provider] || []).find((m) => m.id === model);
  return known || { id: model, label: model, verified: "custom", ...(CUSTOM_DEFAULTS[provider] || {}) };
}

/**
 * Estimated cost in US dollars, or null when the model's price is unknown or a free tier.
 */
function estimateCost(provider, model, inputTokens, outputTokens) {
  const price = modelSpec(provider, model).price;
  if (!price) return null;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

module.exports = { MODELS, modelSpec, estimateCost };
