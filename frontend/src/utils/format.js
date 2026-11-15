/**
 * Display formatting shared by pages.
 *
 * Dates are stored and sent in AD. These helpers show them in the calendar the
 * person chose (lib/calendar/datePrefs.js): Bikram Sambat by default, AD, or
 * both. Conversion is done by lib/calendar; nothing here does date maths with a
 * local-time Date, so the day never shifts with the device's timezone:
 *  - a calendar day ("2026-04-14", or the "2026-04-14T00:00:00.000Z" the API
 *    sends for a DATE column) keeps its own digits;
 *  - a real timestamp is shown as the day and time it was in Nepal.
 */
import { todayAd as kathmanduToday, kathmanduTime, diffDays, adToBs } from "../lib/calendar/bsDateAdapter";
import { toIsoDate, isDateOnlyValue } from "../lib/calendar/dateValidation";
import { formatByPrefs, formatTime, digits, bsMonthName, adMonthName } from "../lib/calendar/dateFormatter";
import { getDatePrefs } from "../lib/calendar/datePrefs";

/** Today's date in Nepal as AD "YYYY-MM-DD" (what date fields and filters use). */
export const todayAd = () => kathmanduToday();

/**
 * "1 Baisakh 2083", "14 Apr 2026" or "1 Baisakh 2083 (14 Apr 2026)", following
 * the person's preference. `calendar` forces one for a place that must not
 * change (a printed form that asks for AD, say).
 */
export const formatDate = (value, fallback = "—", { calendar, style } = {}) => {
  const iso = toIsoDate(value);
  if (!iso) return fallback;
  const prefs = calendar ? { ...getDatePrefs(), calendar } : getDatePrefs();
  return formatByPrefs(iso, prefs, { style }) || fallback;
};

/** "1 Baisakh 2083, 10:30 AM": the day and time in Nepal. */
export const formatDateTime = (value, fallback = "—") => {
  const iso = toIsoDate(value);
  if (!iso) return fallback;
  const prefs = getDatePrefs();
  const day = formatByPrefs(iso, prefs);
  if (isDateOnlyValue(value)) return day;
  const instant = value instanceof Date ? value : new Date(value);
  return `${day}, ${formatTime(kathmanduTime(instant), prefs.numerals)}`;
};

/** Whole Nepal calendar days from today to a date: 0 today, negative in the past. Null for no date. */
export const daysFromToday = (value) => {
  const iso = toIsoDate(value);
  return iso ? diffDays(todayAd(), iso) : null;
};

/** "2 days ago" / "in 3 days" / "today", counted in Nepal calendar days. */
export const formatRelative = (value) => {
  const days = daysFromToday(value);
  if (days === null) return "";
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days === 1) return "tomorrow";
  const n = digits(Math.abs(days), getDatePrefs().numerals);
  return days < 0 ? `${n} days ago` : `in ${n} days`;
};

/**
 * The month and day of a date for a small "date badge" or a chart axis, in the
 * person's calendar: { month: "Kartik", monthShort: "Kar", day: "28" }, or null.
 */
export const dayParts = (value) => {
  const iso = toIsoDate(value);
  if (!iso) return null;
  const { calendar, language, numerals } = getDatePrefs();
  const bs = calendar === "ad" ? null : adToBs(iso);
  if (bs) {
    const month = bsMonthName(bs.month, language);
    return { month, monthShort: language === "ne" ? month : month.slice(0, 3), day: digits(bs.day, numerals) };
  }
  const [, m, d] = iso.split("-").map(Number);
  return { month: adMonthName(m, language), monthShort: adMonthName(m, language, true), day: digits(d, numerals) };
};

/** "28 Kar" / "14 Nov": a day without its year, for chart axes. */
export const formatShortDay = (value) => {
  const parts = dayParts(value);
  return parts ? `${parts.day} ${parts.monthShort}` : "";
};

/** The AD "YYYY-MM-DD" value a date field holds, from an ISO date or a Date. */
export const toDateInput = (value) => toIsoDate(value) || "";

/** "Rs. 12,500" (Nepali rupees, Indian digit grouping). */
export const formatCurrency = (value, { decimals = 0 } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`;
};

/** "1,234" */
export const formatNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("en-IN") : "—";
};

/**
 * "Ram Bahadur Thapa" from { firstName, middleName, lastName } (or a user nested
 * inside). The middle name is optional. Every name the UI shows goes through here.
 */
export const fullName = (person) => {
  const p = person?.user || person || {};
  return [p.firstName, p.middleName, p.lastName]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ");
};
