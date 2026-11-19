/**
 * How dates are shown: which calendar (BS, AD or both), which language for
 * month and weekday names, and which numerals.
 *
 * Two layers:
 *  - the school's defaults (Calendar settings, sent with the sign-in profile);
 *  - what this person chose on this browser, kept in localStorage.
 * The person's choice wins where they made one.
 *
 * A plain store, not React state, so `formatDate()` in utils/format.js can read
 * it from anywhere. `useDatePrefs()` (hooks/useDatePrefs.js) re-renders a
 * component when it changes.
 */

const STORAGE_KEY = "sms.calendar.prefs";

const CALENDARS = ["bs", "ad", "both"];
const LANGUAGES = ["en", "ne"];
const NUMERALS = ["en", "ne"];

export const DEFAULT_PREFS = Object.freeze({
  calendar: "bs",
  language: "en",
  numerals: "en",
  weekStartsOn: 0,
  weeklyHolidayDays: Object.freeze([6]),
});

const readStored = () => {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || "null");
    if (!raw || typeof raw !== "object") return {};
    const out = {};
    if (CALENDARS.includes(raw.calendar)) out.calendar = raw.calendar;
    if (LANGUAGES.includes(raw.language)) out.language = raw.language;
    if (NUMERALS.includes(raw.numerals)) out.numerals = raw.numerals;
    return out;
  } catch {
    return {};
  }
};

let school = { ...DEFAULT_PREFS };
let personal = readStored();
let snapshot = Object.freeze({ ...school, ...personal });
const listeners = new Set();

const publish = () => {
  snapshot = Object.freeze({ ...school, ...personal });
  listeners.forEach((fn) => fn());
};

/** The preferences in force. The same object until something changes. */
export const getDatePrefs = () => snapshot;

/** What this person chose themselves (an empty object when they follow the school). */
export const getPersonalDatePrefs = () => personal;

export const subscribeDatePrefs = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** The school's settings, from `user.school.calendar`. Null puts the defaults back. */
export const setSchoolDatePrefs = (config) => {
  const next = { ...DEFAULT_PREFS };
  if (config && typeof config === "object") {
    if (CALENDARS.includes(config.defaultCalendar)) next.calendar = config.defaultCalendar;
    if (LANGUAGES.includes(config.defaultLanguage)) next.language = config.defaultLanguage;
    if (NUMERALS.includes(config.defaultNumerals)) next.numerals = config.defaultNumerals;
    if (Number.isInteger(config.weekStartsOn) && config.weekStartsOn >= 0 && config.weekStartsOn <= 6) next.weekStartsOn = config.weekStartsOn;
    if (Array.isArray(config.weeklyHolidayDays)) next.weeklyHolidayDays = Object.freeze([...config.weeklyHolidayDays]);
  }
  if (JSON.stringify(next) === JSON.stringify(school)) return;
  school = next;
  publish();
};

/** This person's own choice: any of { calendar, language, numerals }. */
export const setPersonalDatePrefs = (partial) => {
  const next = { ...personal };
  if (CALENDARS.includes(partial?.calendar)) next.calendar = partial.calendar;
  if (LANGUAGES.includes(partial?.language)) next.language = partial.language;
  if (NUMERALS.includes(partial?.numerals)) next.numerals = partial.numerals;
  personal = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(personal));
  } catch {
    // Private mode or storage full: the choice lasts for this page only.
  }
  publish();
};

/** Back to the school's defaults. */
export const clearPersonalDatePrefs = () => {
  personal = {};
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
  publish();
};
