/**
 * BS and AD dates as text, in English or Nepali, with either numerals. Pure:
 * mirrors backend/src/utils/calendar/dateFormatter.js. The page-level helpers
 * that follow the user's preference are in utils/format.js.
 */
import { adToBs, isIsoDate, weekdayOf } from "./bsDateAdapter";
import {
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  AD_MONTHS_EN,
  AD_MONTHS_SHORT_EN,
  AD_MONTHS_NE,
  WEEKDAYS_EN,
  WEEKDAYS_SHORT_EN,
  WEEKDAYS_NE,
  WEEKDAYS_SHORT_NE,
  NEPALI_DIGITS,
} from "./calendarConstants";

/** "2083" -> "२०८३". */
export const toNepaliDigits = (value) => String(value).replace(/[0-9]/g, (d) => NEPALI_DIGITS[d]);

/** "२०८३" -> "2083". */
export const toLatinDigits = (value) => String(value).replace(/[०-९]/g, (d) => String(NEPALI_DIGITS.indexOf(d)));

/** A number in the chosen numerals. */
export const digits = (value, numerals) => (numerals === "ne" ? toNepaliDigits(value) : String(value));

const pad = (n) => String(n).padStart(2, "0");

export const bsMonthName = (month, language = "en") => (language === "ne" ? BS_MONTHS_NE : BS_MONTHS_EN)[month - 1] ?? "";
export const adMonthName = (month, language = "en", short = false) =>
  (language === "ne" ? AD_MONTHS_NE : short ? AD_MONTHS_SHORT_EN : AD_MONTHS_EN)[month - 1] ?? "";
export const weekdayName = (weekday, language = "en", short = false) =>
  (language === "ne" ? (short ? WEEKDAYS_SHORT_NE : WEEKDAYS_NE) : short ? WEEKDAYS_SHORT_EN : WEEKDAYS_EN)[weekday] ?? "";

/**
 * A BS date as text.
 *   style "long"    -> "1 Baisakh 2083" / "१ बैशाख २०८३"
 *   style "numeric" -> "2083/01/01"     / "२०८३/०१/०१"
 */
export const formatBs = (bs, { language = "en", numerals = "en", style = "long" } = {}) => {
  if (!bs) return "";
  if (style === "numeric") return digits(`${bs.year}/${pad(bs.month)}/${pad(bs.day)}`, numerals);
  return `${digits(bs.day, numerals)} ${bsMonthName(bs.month, language)} ${digits(bs.year, numerals)}`;
};

/**
 * An AD "YYYY-MM-DD" date as text.
 *   style "long"    -> "14 Apr 2026"
 *   style "numeric" -> "2026-04-14"
 */
export const formatAd = (iso, { language = "en", numerals = "en", style = "long" } = {}) => {
  if (!isIsoDate(iso)) return "";
  if (style === "numeric") return digits(iso, numerals);
  const [y, m, d] = iso.split("-").map(Number);
  return `${digits(d, numerals)} ${adMonthName(m, language, true)} ${digits(y, numerals)}`;
};

/** The BS text for an AD date ("" when it cannot be converted). */
export const formatAdAsBs = (iso, options) => formatBs(adToBs(iso), options);

/** "Tuesday" for an AD date. */
export const weekdayNameOf = (iso, language = "en", short = false) => {
  const w = weekdayOf(iso);
  return w === null ? "" : weekdayName(w, language, short);
};

/**
 * An AD date in the calendar the person chose:
 *   bs   -> "1 Baisakh 2083"
 *   ad   -> "14 Apr 2026"
 *   both -> "1 Baisakh 2083 (14 Apr 2026)"
 * A date outside the BS table is shown in AD.
 */
export const formatByPrefs = (iso, prefs = {}, { style = "long" } = {}) => {
  if (!isIsoDate(iso)) return "";
  const { calendar = "bs", language = "en", numerals = "en" } = prefs;
  const ad = formatAd(iso, { language, numerals, style });
  if (calendar === "ad") return ad;
  const bs = formatAdAsBs(iso, { language, numerals, style });
  if (!bs) return ad;
  return calendar === "both" ? `${bs} (${ad})` : bs;
};

/** The other calendar's text for a date: AD when BS is shown, BS when AD is shown. */
export const formatSecondary = (iso, prefs = {}, { style = "long" } = {}) => {
  if (!isIsoDate(iso)) return "";
  const { calendar = "bs", language = "en", numerals = "en" } = prefs;
  return calendar === "ad" ? formatAdAsBs(iso, { language, numerals, style }) : formatAd(iso, { language, numerals, style });
};

/** "10:30" -> "10:30 AM" (or Nepali numerals). */
export const formatTime = (hhmm, numerals = "en") => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return "";
  const h = Number(m[1]);
  return `${digits(`${h % 12 === 0 ? 12 : h % 12}:${m[2]}`, numerals)} ${h < 12 ? "AM" : "PM"}`;
};
