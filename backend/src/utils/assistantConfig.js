/**
 * The AI help assistant's per-school settings (`School.assistantConfig`, JSON).
 *
 * Same pattern as `reportCardLayout.js` and `calendar/calendarConfig.js`:
 *  - `normalizeAssistantConfig(raw)` turns whatever is stored (or null) into a complete,
 *    safe settings object. Unknown keys are dropped, bad values fall back to the defaults.
 *  - `validateAssistantConfig(input)` checks what an administrator sends and returns
 *    `{ value, errors }`; the caller stores `value` only when `errors` is empty.
 *
 * API keys are never part of these settings: they live only in the server's environment.
 */

const PROVIDER_IDS = Object.freeze(["gemini", "nvidia", "openai", "anthropic"]);
const ASSISTANT_ROLES = Object.freeze(["SUPER_ADMIN", "ADMIN", "TEACHER", "EXAM_OFFICER", "ACCOUNTANT", "STUDENT", "PARENT"]);
const LANGUAGES = Object.freeze(["auto", "en", "ne"]);

/** Model ids look like "gemini-3.5-flash-lite" or "nvidia/nemotron-3.5-lightning-30b-a3b". */
const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;

const RANGES = Object.freeze({
  timeoutMs: { min: 5000, max: 120000 },
  maxOutputTokens: { min: 200, max: 8000 },
  temperature: { min: 0, max: 1 },
  retentionDays: { min: 1, max: 730 },
  userDailyLimit: { min: 1, max: 1000 },
  /** 0 = no budget. */
  monthlyTokenBudget: { min: 0, max: 1_000_000_000 },
});

const DEFAULT_ASSISTANT_CONFIG = Object.freeze({
  enabled: true,
  roles: ASSISTANT_ROLES,
  provider: "gemini",
  model: "gemini-3.5-flash-lite",
  // Off until an administrator turns it on (spec: fallback is opt-in).
  fallback: Object.freeze({ enabled: false, provider: "nvidia", model: "nvidia/nemotron-3.5-lightning-30b-a3b" }),
  timeoutMs: 45000,
  maxOutputTokens: 1200,
  temperature: 0.3,
  defaultLanguage: "auto",
  autoDetect: true,
  retentionDays: 90,
  userDailyLimit: 50,
  monthlyTokenBudget: 2_000_000,
});

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const inRange = (value, { min, max }) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const pickNumber = (value, key, fallback) => (inRange(value, RANGES[key]) ? value : fallback);
const pickBool = (value, fallback) => (typeof value === "boolean" ? value : fallback);
const pickProvider = (value, fallback) => (PROVIDER_IDS.includes(value) ? value : fallback);
const pickModel = (value, fallback) => (typeof value === "string" && MODEL_ID.test(value) ? value : fallback);

/** Roles in a fixed order, duplicates and unknown names dropped. */
const pickRoles = (value, fallback) => {
  if (!Array.isArray(value)) return [...fallback];
  return ASSISTANT_ROLES.filter((r) => value.includes(r));
};

/**
 * A complete settings object from whatever is stored. Never throws.
 * @param {unknown} raw  `School.assistantConfig`
 */
function normalizeAssistantConfig(raw) {
  const d = DEFAULT_ASSISTANT_CONFIG;
  const src = isPlainObject(raw) ? raw : {};
  const fb = isPlainObject(src.fallback) ? src.fallback : {};
  return {
    enabled: pickBool(src.enabled, d.enabled),
    roles: pickRoles(src.roles, d.roles),
    provider: pickProvider(src.provider, d.provider),
    model: pickModel(src.model, d.model),
    fallback: {
      enabled: pickBool(fb.enabled, d.fallback.enabled),
      provider: pickProvider(fb.provider, d.fallback.provider),
      model: pickModel(fb.model, d.fallback.model),
    },
    timeoutMs: Math.round(pickNumber(src.timeoutMs, "timeoutMs", d.timeoutMs)),
    maxOutputTokens: Math.round(pickNumber(src.maxOutputTokens, "maxOutputTokens", d.maxOutputTokens)),
    temperature: pickNumber(src.temperature, "temperature", d.temperature),
    defaultLanguage: LANGUAGES.includes(src.defaultLanguage) ? src.defaultLanguage : d.defaultLanguage,
    autoDetect: pickBool(src.autoDetect, d.autoDetect),
    retentionDays: Math.round(pickNumber(src.retentionDays, "retentionDays", d.retentionDays)),
    userDailyLimit: Math.round(pickNumber(src.userDailyLimit, "userDailyLimit", d.userDailyLimit)),
    monthlyTokenBudget: Math.round(pickNumber(src.monthlyTokenBudget, "monthlyTokenBudget", d.monthlyTokenBudget)),
  };
}

/**
 * Check an administrator's update. Fields left out keep their current value.
 * @param {unknown} input   the request body
 * @param {object} current  the school's current normalized settings
 * @returns {{ value: object, errors: Array<{ field: string, message: string }> }}
 */
function validateAssistantConfig(input, current = normalizeAssistantConfig(null)) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  if (!isPlainObject(input)) {
    return { value: current, errors: [{ field: "body", message: "Settings must be an object" }] };
  }
  const next = { ...current, fallback: { ...current.fallback } };

  for (const key of ["enabled", "autoDetect"]) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== "boolean") add(key, `${key} must be true or false`);
    else next[key] = input[key];
  }

  if (input.roles !== undefined) {
    if (!Array.isArray(input.roles) || input.roles.some((r) => !ASSISTANT_ROLES.includes(r))) {
      add("roles", `roles must be a list of: ${ASSISTANT_ROLES.join(", ")}`);
    } else {
      next.roles = pickRoles(input.roles, []);
    }
  }

  if (input.provider !== undefined) {
    if (!PROVIDER_IDS.includes(input.provider)) add("provider", `provider must be one of: ${PROVIDER_IDS.join(", ")}`);
    else next.provider = input.provider;
  }
  if (input.model !== undefined) {
    if (typeof input.model !== "string" || !MODEL_ID.test(input.model)) add("model", "model must be a model id such as gemini-3.5-flash-lite");
    else next.model = input.model;
  }

  if (input.fallback !== undefined) {
    if (!isPlainObject(input.fallback)) {
      add("fallback", "fallback must be an object");
    } else {
      const fb = input.fallback;
      if (fb.enabled !== undefined) {
        if (typeof fb.enabled !== "boolean") add("fallback.enabled", "fallback.enabled must be true or false");
        else next.fallback.enabled = fb.enabled;
      }
      if (fb.provider !== undefined) {
        if (!PROVIDER_IDS.includes(fb.provider)) add("fallback.provider", `fallback.provider must be one of: ${PROVIDER_IDS.join(", ")}`);
        else next.fallback.provider = fb.provider;
      }
      if (fb.model !== undefined) {
        if (typeof fb.model !== "string" || !MODEL_ID.test(fb.model)) add("fallback.model", "fallback.model must be a model id");
        else next.fallback.model = fb.model;
      }
    }
  }

  for (const key of Object.keys(RANGES)) {
    if (input[key] === undefined) continue;
    const { min, max } = RANGES[key];
    if (!inRange(input[key], RANGES[key])) add(key, `${key} must be a number from ${min} to ${max}`);
    else next[key] = key === "temperature" ? input[key] : Math.round(input[key]);
  }

  if (input.defaultLanguage !== undefined) {
    if (!LANGUAGES.includes(input.defaultLanguage)) add("defaultLanguage", "defaultLanguage must be auto, en or ne");
    else next.defaultLanguage = input.defaultLanguage;
  }

  if (next.fallback.enabled && next.fallback.provider === next.provider && next.fallback.model === next.model) {
    add("fallback", "The fallback must be a different provider or model");
  }

  return { value: next, errors };
}

/**
 * The roles a signed-in user may use the assistant as. A super admin counts as an admin
 * (as everywhere else), so a school that allows ADMIN also allows SUPER_ADMIN.
 * @param {string[]} userRoles  req.user.roles
 * @param {object} settings     normalized settings
 */
function allowedAssistantRoles(userRoles = [], settings = DEFAULT_ASSISTANT_CONFIG) {
  return (userRoles || []).filter((role) => settings.roles.includes(role) || (role === "SUPER_ADMIN" && settings.roles.includes("ADMIN")));
}

module.exports = {
  PROVIDER_IDS,
  ASSISTANT_ROLES,
  LANGUAGES,
  RANGES,
  DEFAULT_ASSISTANT_CONFIG,
  normalizeAssistantConfig,
  validateAssistantConfig,
  allowedAssistantRoles,
};
