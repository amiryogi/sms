/**
 * The school's calendar settings: School.calendarConfig (JSON, null = defaults).
 * Same shape of rules as utils/reportCardLayout.js: `validateConfig` checks what
 * the admin form sends, `normalizeConfig` turns whatever is stored into a
 * complete object and never throws.
 */

const CALENDARS = ["bs", "ad", "both"];
const LANGUAGES = ["en", "ne"];
const NUMERALS = ["en", "ne"];
const TIMEZONE = "Asia/Kathmandu";

const DEFAULT_CONFIG = Object.freeze({
  defaultCalendar: "bs", // what dates look like: BS, AD, or BS with AD beside it
  defaultLanguage: "en", // month and weekday names
  defaultNumerals: "en", // 0-9 or ०-९
  weekStartsOn: 0, // 0 = Sunday
  weeklyHolidayDays: Object.freeze([6]), // weekly days off, 0 = Sunday ... 6 = Saturday
  blockAttendanceOnNonWorkingDays: true,
  timezone: TIMEZONE,
});

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isWeekday = (n) => Number.isInteger(n) && n >= 0 && n <= 6;

/** Returns [{ field, message }], empty when the settings are valid. */
const validateConfig = (raw) => {
  if (!isPlainObject(raw)) return [{ field: "config", message: "Settings must be an object" }];
  const errors = [];
  const add = (field, message) => errors.push({ field, message });

  if (raw.defaultCalendar !== undefined && !CALENDARS.includes(raw.defaultCalendar)) {
    add("defaultCalendar", `Must be one of: ${CALENDARS.join(", ")}`);
  }
  if (raw.defaultLanguage !== undefined && !LANGUAGES.includes(raw.defaultLanguage)) {
    add("defaultLanguage", `Must be one of: ${LANGUAGES.join(", ")}`);
  }
  if (raw.defaultNumerals !== undefined && !NUMERALS.includes(raw.defaultNumerals)) {
    add("defaultNumerals", `Must be one of: ${NUMERALS.join(", ")}`);
  }
  if (raw.weekStartsOn !== undefined && !isWeekday(raw.weekStartsOn)) {
    add("weekStartsOn", "Must be a weekday number from 0 (Sunday) to 6 (Saturday)");
  }
  if (raw.weeklyHolidayDays !== undefined) {
    if (!Array.isArray(raw.weeklyHolidayDays) || !raw.weeklyHolidayDays.every(isWeekday)) {
      add("weeklyHolidayDays", "Must be a list of weekday numbers from 0 (Sunday) to 6 (Saturday)");
    } else if (new Set(raw.weeklyHolidayDays).size >= 7) {
      add("weeklyHolidayDays", "At least one day of the week must be a working day");
    }
  }
  if (raw.blockAttendanceOnNonWorkingDays !== undefined && typeof raw.blockAttendanceOnNonWorkingDays !== "boolean") {
    add("blockAttendanceOnNonWorkingDays", "Must be true or false");
  }
  return errors;
};

/** A complete settings object from whatever is stored. */
const normalizeConfig = (raw) => {
  const out = { ...DEFAULT_CONFIG, weeklyHolidayDays: [...DEFAULT_CONFIG.weeklyHolidayDays] };
  if (!isPlainObject(raw)) return out;

  if (CALENDARS.includes(raw.defaultCalendar)) out.defaultCalendar = raw.defaultCalendar;
  if (LANGUAGES.includes(raw.defaultLanguage)) out.defaultLanguage = raw.defaultLanguage;
  if (NUMERALS.includes(raw.defaultNumerals)) out.defaultNumerals = raw.defaultNumerals;
  if (isWeekday(raw.weekStartsOn)) out.weekStartsOn = raw.weekStartsOn;
  if (Array.isArray(raw.weeklyHolidayDays)) {
    const days = [...new Set(raw.weeklyHolidayDays.filter(isWeekday))].sort((a, b) => a - b);
    if (days.length < 7) out.weeklyHolidayDays = days;
  }
  if (typeof raw.blockAttendanceOnNonWorkingDays === "boolean") {
    out.blockAttendanceOnNonWorkingDays = raw.blockAttendanceOnNonWorkingDays;
  }
  return out;
};

module.exports = { CALENDARS, LANGUAGES, NUMERALS, TIMEZONE, DEFAULT_CONFIG, validateConfig, normalizeConfig };
