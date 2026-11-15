/**
 * The help assistant's per-person settings on this browser, same pattern as
 * lib/calendar/datePrefs.js:
 *  - language: "auto" | "en" | "ne" (localStorage "sms.assistant.prefs"; sent with each question,
 *    the server decides with it);
 *  - the open conversation, per tab (sessionStorage "sms.assistant.session"), so a reload or a
 *    walkthrough's page change keeps the chat.
 * Storage may be unavailable (private mode): everything still works for the page's lifetime.
 */

const PREFS_KEY = "sms.assistant.prefs";
const SESSION_KEY = "sms.assistant.session";
export const LANGUAGES = Object.freeze(["auto", "en", "ne"]);

const read = (storage, key) => {
  try {
    return JSON.parse(globalThis[storage]?.getItem(key) || "null") || {};
  } catch {
    return {};
  }
};
const write = (storage, key, value) => {
  try {
    globalThis[storage]?.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: keep the value in memory only
  }
};

let prefs = (() => {
  const stored = read("localStorage", PREFS_KEY);
  return { language: LANGUAGES.includes(stored.language) ? stored.language : null };
})();
let session = read("sessionStorage", SESSION_KEY);

const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** The person's language choice; null when they never chose (the school default applies). */
export const getAssistantPrefs = () => prefs;

export const setAssistantLanguage = (language) => {
  if (!LANGUAGES.includes(language)) return;
  prefs = { ...prefs, language };
  write("localStorage", PREFS_KEY, prefs);
  notify();
};

export const getAssistantSession = () => session;

/** Remember the open conversation (and whether the panel is open) for this tab. */
export const setAssistantSession = (partial) => {
  session = { ...session, ...partial };
  write("sessionStorage", SESSION_KEY, session);
};

export const clearAssistantSession = () => {
  session = {};
  try {
    globalThis.sessionStorage?.removeItem(SESSION_KEY);
  } catch {
    // nothing to clear
  }
};

export const subscribeAssistantPrefs = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
