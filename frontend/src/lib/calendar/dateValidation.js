/**
 * Reading and checking calendar dates in the browser without a timezone shift.
 * Mirrors backend/src/utils/calendar/dateValidation.js.
 */
import { isIsoDate, isValidBs, kathmanduDay, MIN_BS_YEAR, MAX_BS_YEAR } from "./bsDateAdapter";
import { toLatinDigits } from "./dateFormatter";

const LEADING_DAY = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.0+)?Z)?$/;

/**
 * True when the value is a calendar day and not a moment: "2026-04-14", or the
 * "2026-04-14T00:00:00.000Z" the API sends for a DATE column.
 */
export const isDateOnlyValue = (value) => typeof value === "string" && DATE_ONLY.test(value.trim());

/**
 * The AD calendar day a value stands for, "YYYY-MM-DD", or null.
 *  - a date-only string keeps its own digits;
 *  - a real timestamp (string or Date) is the day it falls on in Nepal.
 */
export const toIsoDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : kathmanduDay(value);
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (isDateOnlyValue(text)) {
    const day = text.slice(0, 10);
    return isIsoDate(day) ? day : null;
  }
  const instant = new Date(text);
  if (Number.isNaN(instant.getTime())) return null;
  // A string with a time but no zone ("2026-04-14 10:30") names that wall-clock day.
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
    const m = LEADING_DAY.exec(text);
    if (m && isIsoDate(m[1])) return m[1];
  }
  return kathmanduDay(instant);
};

/** True when `iso` lies in [min, max]; either bound may be left out. */
export const isWithin = (iso, min, max) => {
  if (!isIsoDate(iso)) return false;
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
};

/**
 * What someone typed as a BS date ("2083-01-15", "2083/1/15", "२०८३/०१/१५")
 * -> { year, month, day }, or null when it is not a real BS date.
 */
export const parseBsInput = (text) => {
  const m = /^\s*(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})\s*$/.exec(toLatinDigits(String(text ?? "")));
  if (!m) return null;
  const bs = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return isValidBs(bs) ? bs : null;
};

/** What someone typed as an AD date ("2026-04-14", "2026/4/14") -> "YYYY-MM-DD", or null. */
export const parseAdInput = (text) => {
  const m = /^\s*(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})\s*$/.exec(toLatinDigits(String(text ?? "")));
  if (!m) return null;
  const iso = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return isIsoDate(iso) ? iso : null;
};

/** Why a typed BS date is wrong, for the message under the field. */
export const bsInputProblem = (text) => {
  const m = /^\s*(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})\s*$/.exec(toLatinDigits(String(text ?? "")));
  if (!m) return "Write the date as year-month-day, for example 2083-01-15";
  const [year, month] = [Number(m[1]), Number(m[2])];
  if (year < MIN_BS_YEAR || year > MAX_BS_YEAR) return `The year must be between ${MIN_BS_YEAR} and ${MAX_BS_YEAR}`;
  if (month < 1 || month > 12) return "The month must be between 1 and 12";
  return "That month does not have this day";
};
