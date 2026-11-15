/**
 * The AI providers the assistant can use, and how each one is built.
 *
 * API keys come only from the server's environment (backend/.env or the host's settings):
 *   GEMINI_API_KEY, NVIDIA_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
 * They are read when a provider is built and never returned by any endpoint: callers get
 * `keyConfigured: true|false` only.
 */
const { createGeminiProvider } = require("./gemini");
const { createOpenAICompatibleProvider } = require("./openaiCompatible");
const { createAnthropicProvider } = require("./anthropic");
const { MODELS } = require("./models");

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

const PROVIDERS = Object.freeze({
  gemini: {
    label: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    dataNote: "On Google's free tier, prompts may be used to improve Google's products. Use a paid key for production.",
    build: (apiKey) => createGeminiProvider({ apiKey }),
  },
  nvidia: {
    label: "NVIDIA (build.nvidia.com)",
    envKey: "NVIDIA_API_KEY",
    dataNote: "NVIDIA's free API catalog is meant for development and testing; check its terms before production use. Nepali answers are weaker than Gemini's.",
    build: (apiKey) => createOpenAICompatibleProvider({ id: "nvidia", apiKey, baseURL: process.env.NVIDIA_BASE_URL || NVIDIA_BASE_URL }),
  },
  openai: {
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    dataNote: "Paid per token.",
    build: (apiKey) => createOpenAICompatibleProvider({ id: "openai", apiKey, baseURL: process.env.OPENAI_BASE_URL || undefined }),
  },
  anthropic: {
    label: "Anthropic Claude",
    envKey: "ANTHROPIC_API_KEY",
    dataNote: "Paid per token.",
    build: (apiKey) => createAnthropicProvider({ apiKey }),
  },
});

/** The key from the environment, trimmed; null when unset. */
const apiKeyFor = (providerId) => {
  const name = PROVIDERS[providerId]?.envKey;
  const value = name ? process.env[name] : undefined;
  return value && value.trim() ? value.trim() : null;
};

const keyConfigured = (providerId) => apiKeyFor(providerId) !== null;

/** What the admin page may show: never a key. */
const describeProviders = () =>
  Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    label: p.label,
    keyConfigured: keyConfigured(id),
    envKey: p.envKey,
    dataNote: p.dataNote,
    models: (MODELS[id] || []).map(({ id: modelId, label, verified, price }) => ({ id: modelId, label, verified, price })),
  }));

module.exports = { PROVIDERS, apiKeyFor, keyConfigured, describeProviders };
